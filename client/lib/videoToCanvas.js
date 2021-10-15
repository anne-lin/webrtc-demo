function VideoToCanvasTmp(videoElement,canvas) {
    canvas.width = videoElement.offsetWidth;
    canvas.height = videoElement.offsetHeight;
    let ctx = canvas.getContext('2d'),
        timer;

    function drawCanvas() {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        timer = setInterval(() => {
            drawCanvas()
        },3000)
        //timer=requestAnimationFrame(drawCanvas);
    }

    function stopDraw() {
        //cancelAnimationFrame(timer);
        clearInterval(timer);
    }
    videoElement.addEventListener("play", function () {
        console.log("开始播放canvas")
        drawCanvas();
    })
    videoElement.addEventListener('pause', stopDraw, false);
    videoElement.addEventListener('ended', stopDraw, false);
}

function VideoToCanvas(videoElement) {
    if(!videoElement) {return;}

    var canvas = document.getElementById("canvas2");
    canvas.width = videoElement.offsetWidth;
    canvas.height = videoElement.offsetHeight;
    ctx = canvas.getContext('2d');

    var newVideo = videoElement.cloneNode(false);

    var timer = null;

    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

    var cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

    function drawCanvas() {
      ctx.drawImage(newVideo, 0, 0, canvas.width, canvas.height);
      timer = requestAnimationFrame(drawCanvas);
    }

    function stopDrawing() {
      cancelAnimationFrame(timer);
    }
    newVideo.addEventListener('play', function() {
        drawCanvas();
    }, false);
    
      newVideo.addEventListener('pause', stopDrawing, false);
      newVideo.addEventListener('ended', stopDrawing, false);
  
      //videoElement.parentNode.replaceChild(canvas, videoElement);
  
      this.play = function() {
        newVideo.play();
      };
  
      this.pause = function() {
        newVideo.pause();
      };
  
      this.playPause = function() {
        if(newVideo.paused) {
          this.play();
        } else {
          this.pause();
        }
      };
  
      this.change = function(src) {
        if(!src) {return;}
        newVideo.src = src;
      };
  
      this.drawFrame = drawCanvas;
}
