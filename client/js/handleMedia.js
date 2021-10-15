class HandleMedia{
  constructor(){

  }
  getLocalMedia(constraints){
    return new Promise((resolve,reject)=>{
      navigator.mediaDevices.getUserMedia(constraints)
      .then((mediaStream)=>{
        resolve(mediaStream);
      })
      .catch((e)=>{
        reject(e);
      })
    });
  }
}