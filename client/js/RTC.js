class RTC {
    constructor(callback) {
        this.callback = callback || {};
        this.peerConnection = new RTCPeerConnection(
            //非必需，ice联通策略：内网（直接访问），外网（优先p2p,次relay）
            {
                iceServers: [{
                    urls: 'stun:stun.l.google.com:19302' // 使用谷歌的stun服务
                }]
            });
        this.peerConnection.onaddstream = (event) => {
            if (callback.onaddRemoteStream) {
                this.callback.onaddRemoteStream(event.stream);
            }
            this.remoteStream = event.stream;
        };
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.callback.onicecandidate) {
                this.callback.onicecandidate(event.candidate);
            }
        };
        events.on("socketCandidate", (candidate) => {
            this.getIceMsg(candidate);
        });
        this.getIceMsg = (candidate) => {
            this.peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate),
                () => {
                    console.log("save candidate success");
                },
                this.onError
            );
        }
    }
    localDescCreated(desc) {
        this.peerConnection.setLocalDescription(desc, () => {
            if (this.callback.setLocalDescription) {
                this.callback.setLocalDescription(this.peerConnection.localDescription)
            }
        }, this.onError);
    }
    call(mediaStream) {
        this.localStream = mediaStream;
        this.useCam = true;
        this.isMuted = true;
        this.peerConnection.addStream(mediaStream);
        this.peerConnection.createOffer()
            .then((sdp) => {
                this.localDescCreated(sdp);
            })
            .catch(this.onError);
    }
    answer(sdp, stream) {
        if (!sdp) {
            return;
        }
        this.localStream = stream;
        this.useCam = true;
        this.isMuted = true;
        this.peerConnection.addStream(stream);
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp), () => {
            this.peerConnection.createAnswer()
                .then((sdp) => {
                    this.localDescCreated(sdp);
                })
                .catch(this.onError);
        }, this.onError);
    }
    saveRemoteSdp(sdp) {
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp), function() {
            console.log("save remote sdp success");
        }, this.onError);
    }
    hangup() {
        this.peerConnection.close();
        if (typeof this.remoteStream.stop == 'function') {
            this.remoteStream.stop();
        } else {
            this.remoteStream.active = false;
        }
        remoteVideo.srcObject = null;
    }
    bindWidthChange(bindWidth, callback) {
        let vsender = null,
            senders = this.peerConnection.getSenders();
        senders.forEach(sender => {
            if (sender && sender.track.kind === "video") {
                vsender = sender;
            }
        });
        let parameters = vsender.getParameters();

        if (!parameters.encodings) {
            return;
        }
        parameters.encodings[0].maxBitrate = bindWidth * 1000;

        vsender.setParameters(parameters).then(() => {
            if (callback && typeof callback == "function")
                callback({
                    code: 0,
                    msg: "设置码率成功"
                });
        })
    }
    onError(e) {
        console.log(e);
    }
    stopStream() {
        this.peerConnection.close();
        if (this.localStream.active) {
            var tracks = this.localStream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
        }
    }
    shareScreen(stream) {
        this.changeMedia(stream);
        if (stream.oninactive) {
            return;
        }
        stream.oninactive = (event) => {
            if (this.peerConnection.iceConnectionState !== "closed" && !event.target.active) {
                navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    })
                    .then((mediaStream) => {
                        this.changeMedia(mediaStream);
                    })
            }
        }
    }
    closeShareScreen() {
        this.localStream.getVideoTracks().forEach(track  =>  {  
            track.stop()
        });
    }
    changeMedia(stream) {
        let videoTracks = stream.getVideoTracks()[0];
        console.log("this.localStream:", this.localStream)
        this.localStream.addTrack(videoTracks);
        if (!RTCRtpTransceiver.prototype.setDirection) {
            this.peerConnection.getSenders()[1].replaceTrack(videoTracks);
            //this.peerConnection.getTransceivers()[1].direction = 'sendrecv';
        } else {
            if (this.peerConnection.getTransceivers().length >= 3) {
                console.warn("STOP THE 3th TRANSCEIVER!!!!!")
                this.peerConnection.getTransceivers()[2].stop();
            }
            this.peerConnection.getTransceivers()[1].setDirection('sendrecv');
        }
        if (this.callback.changeMedia) {
            this.callback.changeMedia(stream);
        }
    }
    toggleCam() {
        this.useCam = !this.useCam;
        this.localStream.getVideoTracks().forEach(track  =>  {  
            track.enabled  = this.useCam;
        });
    }
    setMuted() {
        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track  =>  {  
            track.enabled  = this.isMuted;
        })
    }
    getStats(interval, callback) {
        let pc = this.peerConnection,
            { upAudioCallback, upVideoCallback, downAudioCallback, downVideoCallback } = callback;
        let lastUpAudioResult, lastUpVideoResult, lastDownAudioResult, lastDownVideoResult, timeReceiveRecode, packetsLostRate, bandwidth, frameRate, downVideoResolution, upVideoResolution, audioDelay, videoDelay, outAudioCodec, outVideoCodec, inAudioCodec, inVideoCodec;
        timeReceiveRecode = setInterval(() => {
            if (!pc) {
                clearInterval(timeReceiveRecode);
                return;
            }
            pc.getStats().then((reports) => {
                reports.forEach(report => {
                    if (report.type == "track" && report.kind == "video" && report.id.includes("RTCMediaStreamTrack_receiver") && report.frameHeight) {
                        downVideoResolution = report.frameHeight + "*" + report.frameWidth;
                    }
                    if (report.type == "track" && report.kind == "video" && report.id.includes("RTCMediaStreamTrack_sender") && report.frameHeight) {
                        upVideoResolution = report.frameHeight + "*" + report.frameWidth;
                    }
                    if (report.id.includes("RTCRemoteInboundRtpVideoStream") && report.roundTripTime) {
                        videoDelay = report.roundTripTime * 1000;
                    }
                    if (report.id.includes("RTCRemoteInboundRtpAudioStream") && report.roundTripTime) {
                        audioDelay = report.roundTripTime * 1000;
                    }
                    if (report.type == "codec" && report.id.includes("Outbound") && report.mimeType.includes("video") && !report.sdpFmtpLine) {
                        outVideoCodec = report.mimeType.split("/")[1];
                    }
                    if (report.type == "codec" && report.id.includes("Inbound") && report.mimeType.includes("video") && !report.sdpFmtpLine) {
                        inVideoCodec = report.mimeType.split("/")[1];
                    }
                    if (report.type == "codec" && report.id.includes("Inbound") && report.mimeType.includes("audio")) {
                        inAudioCodec = report.mimeType.split("/")[1];
                    }
                    if (report.type == "codec" && report.id.includes("Outbound") && report.mimeType.includes("audio")) {
                        outAudioCodec = report.mimeType.split("/")[1];
                    }
                    if (report.type == "outbound-rtp" && report.mediaType == "audio") {
                        if (lastUpAudioResult && lastUpAudioResult.id == report.id && upAudioCallback && typeof upAudioCallback == "function") {
                            packetsLostRate = (report.retransmittedPacketsSent - lastUpAudioResult.retransmittedPacketsSent) / (report.packetsSent + lastUpAudioResult.retransmittedPacketsSent - lastUpAudioResult.packetsSent - report.retransmittedPacketsSent);
                            bandwidth = ((report.bytesSent - lastUpAudioResult.bytesSent) * 8 * 1000) / (report.timestamp - lastUpAudioResult.timestamp) / 1024;
                            upAudioCallback({
                                packetsLostRate: packetsLostRate * 100 || 0,
                                bandwidth: (typeof bandwidth == "number") ? bandwidth.toFixed(2) : 0,
                                codec: outAudioCodec
                            })
                        }
                        lastUpAudioResult = report;
                    }
                    if (report.type == "outbound-rtp" && report.mediaType == "video") {
                        if (lastUpVideoResult && lastUpVideoResult.id == report.id && upVideoCallback && typeof upVideoCallback == "function") {
                            packetsLostRate = (report.retransmittedPacketsSent - lastUpVideoResult.retransmittedPacketsSent) / (report.packetsSent + lastUpVideoResult.retransmittedPacketsSent - lastUpVideoResult.packetsSent - report.retransmittedPacketsSent);
                            bandwidth = (report.bytesSent - lastUpVideoResult.bytesSent) * 8 * 1000 / (report.timestamp - lastUpVideoResult.timestamp) / 1024;
                            frameRate = (report.framesEncoded - lastUpVideoResult.framesEncoded) * 1000 / (report.timestamp - lastUpVideoResult.timestamp);

                            upVideoCallback({
                                frameRate: (typeof frameRate == "number") ? frameRate.toFixed(2) : 0,
                                packetsLostRate: packetsLostRate * 100 || 0,
                                bandwidth: (typeof bandwidth == "number") ? bandwidth.toFixed(2) : 0,
                                resolution: upVideoResolution || "",
                                codec: outVideoCodec
                            })
                        }
                        lastUpVideoResult = report;
                    }
                    if (report.type == "inbound-rtp" && report.mediaType == "audio") {
                        if (lastDownAudioResult && lastDownAudioResult.id == report.id && downAudioCallback && typeof downAudioCallback == "function") {
                            bandwidth = (report.bytesReceived - lastDownAudioResult.bytesReceived) * 8 * 1000 / (report.timestamp - lastUpVideoResult.timestamp) / 1024;
                            packetsLostRate = (report.packetsLost - lastDownAudioResult.packetsLost) / (report.packetsReceived + lastDownAudioResult.packetsLost - lastDownAudioResult.packetsReceived - report.packetsLost);

                            downAudioCallback({
                                bandwidth: (typeof bandwidth == "number") ? bandwidth.toFixed(2) : 0,
                                packetsLostRate: packetsLostRate * 100 || 0,
                                jitter: report.jitter * 1000,
                                delay: audioDelay || "",
                                codec: inAudioCodec
                            })
                        }
                        lastDownAudioResult = report;
                    }
                    if (report.type == "inbound-rtp" && report.mediaType == "video") {
                        if (lastDownVideoResult && lastDownVideoResult.id == report.id && downVideoCallback && typeof downVideoCallback == "function") {
                            bandwidth = (report.bytesReceived - lastDownVideoResult.bytesReceived) * 8 * 1000 / (report.timestamp - lastUpVideoResult.timestamp) / 1024;
                            packetsLostRate = (report.packetsLost - lastDownVideoResult.packetsLost) / (report.packetsReceived + lastDownVideoResult.packetsLost - lastDownVideoResult.packetsReceived - report.packetsLost);
                            frameRate = (report.framesDecoded - lastDownVideoResult.framesDecoded) * 1000 / (report.timestamp - lastDownVideoResult.timestamp);

                            downVideoCallback({
                                bandwidth: (typeof bandwidth == "number") ? bandwidth.toFixed(2) : 0,
                                packetsLostRate: packetsLostRate * 100 || 0,
                                frameRate: (typeof frameRate == "number") ? frameRate.toFixed(2) : 0,
                                resolution: downVideoResolution || "",
                                delay: videoDelay || 0,
                                codec: inVideoCodec
                            })
                        }
                        lastDownVideoResult = report;
                    }
                });
            }).catch(err => {
                clearInterval(timeReceiveRecode);
                console.error("getStats err:", err)
            })
        }, interval || 1000)
    }
}