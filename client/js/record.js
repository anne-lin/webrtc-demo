const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

document.getElementById('startRecord').onclick = startRecord;
document.getElementById('stopRecord').onclick = stopRecord;
document.getElementById('uploadRecord').onclick = uploadRecord;
document.getElementById('saveRecordToLocal').onclick = saveRecordToLocal;
document.getElementById('showRecordVideo').onclick = showRecordVideo;
document.getElementById('getMeida').onclick = getMeida;

let streamData={
  buffer:[]
},
mediaRecorder;

function getMeida(){
  navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  })
  .then((mediaStream)=>{
    localVideo.srcObject = mediaStream;
    streamData.stream=mediaStream;
  })
  .catch((e)=>{
    console.log(e);
  })
}
//开始录制
function startRecord(){
  let options={
      mimeType:"video/webm;codecs=vp8",
      timeslice:10,
  };
  if(!MediaRecorder.isTypeSupported(options.mimeType)){
    console.log("不支持录制")
    return;
  }
  try{
    mediaRecorder=new MediaRecorder(streamData.stream,options);
  }catch(e){
      console.error("e:",e);
      return;
  }

  mediaRecorder.ondataavailable=(e)=>{
    if(e && e.data && e.data.size > 0){
        streamData.buffer.push(e.data);
    }
  }
  mediaRecorder.start(options.timeslice);
  console.log("开始录制");
}
//结束录制
function stopRecord(){
  mediaRecorder.stop();
  console.log("结束录制");
}
//上传录制
function uploadRecord(){
  var blob = new Blob(streamData.buffer, {type: 'video/mp4'});
  var data = new FormData();
  
  data.append('fileToUpload',blob,"haha.mp4");
  $.ajax({
      url: "url",
      type: 'POST',
      cache: false,
      data: data,
      processData: false,//  不处理发送的数据，因为data值是Formdata对象，不需要对数据做处理
      contentType: false,//  不设置Content-type请求头
      success: function (jsonObj) {
          var res = JSON.parse(jsonObj);
          console.log(res);
      },
      error: function (e) {
          console.log("err:",e);
      }
  })  
}
//展示录屏video
function showRecordVideo(){
  var blob=new Blob(streamData.buffer,{
    type:"video/webm"
  });
  remoteVideo.src=window.URL.createObjectURL(blob);
  remoteVideo.controls=true;
}
//保存录制video到本地
function saveRecordToLocal(){
  var blob = new Blob(streamData.buffer, {type: 'video/webm'});
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');

  a.href = url;
  a.style.display = 'none';
  a.download = 'aaa.webm';
  a.click();
}