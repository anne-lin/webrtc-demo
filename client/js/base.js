const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const roomName = document.getElementById('roomName');
const rateShow = document.getElementById('rateShow');
const canvas = document.getElementById('canvas');
rateShow.style.display="none";
document.getElementById('startButton').onclick=enterRoom;
document.getElementById('shareMedia').onclick=shareMedia;
document.getElementById('hangupButton').onclick = hangup.bind("","request");
document.getElementById('bindWidthChange').onclick = bindWidthChange;
document.getElementById('checkDevice').onclick = checkDevice;
document.getElementById('deviceList').onclick = getDeviceList;
document.getElementById('shareScreen').onclick = shareScreen;
document.getElementById('closeShareScreen').onclick = closeShareScreen;
document.getElementById('toggleCam').onclick = toggleCam;
document.getElementById('muted').onclick = muted;
document.getElementById('getRate').onclick = getRate;

document.getElementById('sendCanvas').onclick = sendCanvas;
document.getElementById('clearCanvas').onclick = clearCanvas;
document.getElementById('closeCanvas').onclick = closeCanvas;

const callback = {
  onicecandidate: function (candidate) {
    socketCon.candidate(candidate);
  },
  setLocalDescription: function (localDescription) {
      socketCon.setLocalDescription(localDescription);
  },
  onaddRemoteStream: function (stream) {
      remoteVideo.srcObject = stream;
  },
  changeMedia:function(stream){
    localVideo.srcObject=stream;
  }
}
let rtc,socketCon,paletteLocal;

//检测设备信息
function checkDevice(){
  navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  }).then(()=>{
    console.log("设备检测正常");
  }).catch(e=>{
    console.log("设备检测异常:",e);
  })
}
//获取设备列表
function getDeviceList(){
  navigator.mediaDevices.enumerateDevices().then((deviceInfos)=>{
    let deviceList={
      audioinput:[],
      audiooutput:[],
      videoinput:[]
    };
    for(let i=0;i<deviceInfos.length;i++){
      deviceList[deviceInfos[i].kind].push(deviceInfos[i]);
    }
    //checkDeviceResult.innerText=JSON.stringify(deviceList)
  }).catch(e=>{
    console.log(e);
  }); 
}
//进入房间
function enterRoom(){
  if(roomName.value){
    socketCon=initSocket(roomName.value);
  }
}
//外呼
function shareMedia(){
  navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  })
  .then((mediaStream)=>{
    localVideo.srcObject = mediaStream;
    rtc = new RTC(callback);
    rtc.call(mediaStream);
    rtc.direction="request";
  })
  .catch((e)=>{
    console.log(e);
  })
}
//接听/保存sdp
events.on("socketOnSdp", function (sdp) {
  if (rtc && rtc.direction && rtc.direction == "request") {
      rtc.saveRemoteSdp(sdp);
  } else {      
    navigator.mediaDevices.getUserMedia({
      video:true,
      audio:true
    })
    .then((mediaStream)=>{
      localVideo.srcObject = mediaStream;
      rtc = new RTC(callback);
      rtc.answer(sdp,mediaStream);
      rtc.direction = "response";
    })
    .catch((e)=>{
      console.log(e);
    })
  }
});
events.on("hangup",function(){
  hangup("response");
})
//挂断：结束媒体流，断开连接
function hangup(type){
  rtc.stopStream();
  localVideo.srcObject=null;
  remoteVideo.srcObject=null;
  rtc=null;
  type=="request" && socketCon.hangup();
}
//修改码率:修改视频压缩码率，kb/s
function bindWidthChange(){
  rtc.bindWidthChange(500,(res)=>{
    console.log(res);
  });
}
//屏幕共享
function shareScreen(){
  navigator.mediaDevices.getDisplayMedia().then(function(stream) {    
    rtc.shareScreen(stream);
  }).catch(e=>{
    console.log("shareScreen:",e);
  })
}
//关闭屏幕共享
function closeShareScreen(){
  rtc.closeShareScreen();
}
//打开/关闭摄像头
function toggleCam(){
  rtc.toggleCam();
}
//麦克风开关切换
function muted(){
  rtc.setMuted();
}
//网络信息查看
function getRate(){
  rateShow.style.display="block";
  rtc.getStats(1000,{
    upAudioCallback:(res)=>{  
      document.getElementById("sendAudioRateHtml").innerText="丢包率："+res.packetsLostRate+",带宽："+res.bandwidth+",编码格式："+res.codec;           
    },
    upVideoCallback:(res)=>{   
      document.getElementById("sendVideoRateHtml").innerText="丢包率："+res.packetsLostRate+",带宽："+res.bandwidth+",帧率："+res.frameRate+",分辨率："+res.resolution+",编码格式："+res.codec; 
    },
    downAudioCallback:(res)=>{   
      document.getElementById("sendAudioRateHtml").innerText="丢包率："+res.packetsLostRate+",带宽："+res.bandwidth+",抖动："+res.jitter+",延迟："+res.delay+",编码格式："+res.codec;                                  
    },
    downVideoCallback:(res)=>{    
      document.getElementById("sendAudioRateHtml").innerText="丢包率："+res.packetsLostRate+",带宽："+res.bandwidth+",延迟："+res.delay+",帧率："+res.frameRate+",分辨率："+res.resolution+",编码格式："+res.codec;                 
    }
  });
}

//发送电子签名
function sendCanvas(){
  let stream = canvas.captureStream();
  rtc.changeMedia(stream);
  paletteLocal=new Palette(canvas, {
    drawColor: 'rgba(19, 206, 102, 1)',
    drawType: 'line',
    lineWidth: 5,
    allowCallback: function (cancel, go) {
      console.log("allowCallback:",cancel, go);
    }
});
}
//清空画布
function clearCanvas(){
  paletteLocal.clear();
}
//关闭电子签名
function closeCanvas(){
  navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  })
  .then((mediaStream)=>{
    rtc.changeMedia(mediaStream);
  })
  paletteLocal.destroy();
}

