const video2 = document.getElementsByClassName('input_video2')[0];
const out2 = document.getElementsByClassName('output2')[0];
const controlsElement2 = document.getElementsByClassName('control2')[0];
const canvasCtx = out2.getContext('2d');

const fpsControl = new FPS();
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

const HEAD_MOVE_THRESHOLD = 0.02; // Define your threshold
let previousNosePosition = null;
let head_movement_counter = 0;
let head_box = null;

function onResultsFaceMesh(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, out2.width, out2.height);
  canvasCtx.drawImage(results.image, 0, 0, out2.width, out2.height);
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      const nosePosition = landmarks[1]; // nose tip landmark

      if (previousNosePosition) {
        const noseMoveX = Math.abs(previousNosePosition.x - nosePosition.x);
        const noseMoveY = Math.abs(previousNosePosition.y - nosePosition.y);

        if (noseMoveX > HEAD_MOVE_THRESHOLD || noseMoveY > HEAD_MOVE_THRESHOLD) {
          const xValues = landmarks.map(pt => pt.x);
          const yValues = landmarks.map(pt => pt.y);
          const xMin = Math.min(...xValues) * out2.width;
          const xMax = Math.max(...xValues) * out2.width;
          const yMin = Math.min(...yValues) * out2.height;
          const yMax = Math.max(...yValues) * out2.height;
          head_box = [xMin, yMin, xMax, yMax];
          head_movement_counter = 60;
        }
      }

      previousNosePosition = nosePosition;

      if (head_movement_counter > 0) {
        canvasCtx.beginPath();
        canvasCtx.rect(head_box[0], head_box[1], head_box[2] - head_box[0], head_box[3] - head_box[1]);
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = 'green';
        canvasCtx.stroke();
        head_movement_counter -= 1;
      }

      drawConnectors(
          canvasCtx, landmarks, FACEMESH_TESSELATION,
          {color: '#C0C0C070', lineWidth: 0.8});
      drawConnectors(
          canvasCtx, landmarks, FACEMESH_RIGHT_EYE,
          {color: '#E0E0E0', lineWidth: 0.8});
      drawConnectors(
          canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW,
          {color: '#E0E0E0', lineWidth: 0.8});
      drawConnectors(
          canvasCtx, landmarks, FACEMESH_LEFT_EYE,
          {color: '#E0E0E0', lineWidth: 0.8});
      drawConnectors(
          canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW,
          {color: '#E0E0E0', lineWidth: 0.8});
      drawConnectors(
          canvasCtx, landmarks, FACEMESH_FACE_OVAL,
          {color: '#E0E0E0', lineWidth: 0.8});
      drawConnectors(
          canvasCtx, landmarks, FACEMESH_LIPS,
          {color: '#E0E0E0', lineWidth: 0.8});
    }
  }
  canvasCtx.restore();
}

const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
  }});
faceMesh.onResults(onResultsFaceMesh);

const camera = new Camera(video2, {
  onFrame: async () => {
    await faceMesh.send({image: video2});
  },
  width: 600,
  height: 600
});
camera.start();

new ControlPanel(controlsElement2, {
  selfieMode: true,
  maxNumFaces: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
})
    .add([
      new StaticText({title: 'FaceMesh'}),
      fpsControl,
      new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
      new Slider({
        title: 'Max Number of Faces',
        field: 'maxNumFaces',
        range: [1, 4],
        step: 1
      }),
      new Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
      }),
      new Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
      }),
    ])
    .on(options => {
      video2.classList.toggle('selfie', options.selfieMode);
      faceMesh.setOptions(options);
    });
