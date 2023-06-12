const videoElement = document.getElementsByClassName('input_video3')[0];
const canvasElement = document.getElementsByClassName('output3')[0];
const controlsElement3 = document.getElementsByClassName('control3')[0];
const canvasCtx3 = canvasElement.getContext('2d');
const fpsControl = new FPS();

const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

const HAND_MOVE_THRESHOLD = 0.02; // Define your threshold
let previousHandLandmarks = [null, null];
let hand_movement_counter = [0, 0];
let hand_boxes = [null, null];

function onResultsHands(results) {
    document.body.classList.add('loaded');
    fpsControl.tick();

    canvasCtx3.save();
    canvasCtx3.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx3.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const landmarks = results.multiHandLandmarks[index];
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';

            if (previousHandLandmarks[index]) {
                const handMove = landmarks.map((pt, i) => {
                    const prev = previousHandLandmarks[index][i];
                    return Math.abs(prev.x - pt.x) > HAND_MOVE_THRESHOLD || Math.abs(prev.y - pt.y) > HAND_MOVE_THRESHOLD;
                });

                if (handMove.some(v => v)) {
                    const xValues = landmarks.map(pt => pt.x);
                    const yValues = landmarks.map(pt => pt.y);
                    const xMin = Math.min(...xValues) * canvasElement.width;
                    const xMax = Math.max(...xValues) * canvasElement.width;
                    const yMin = Math.min(...yValues) * canvasElement.height;
                    const yMax = Math.max(...yValues) * canvasElement.height;
                    hand_boxes[index] = [xMin, yMin, xMax, yMax];
                    hand_movement_counter[index] = 60;
                }
            }

            previousHandLandmarks[index] = landmarks;

            if (hand_movement_counter[index] > 0) {
                canvasCtx3.beginPath();
                canvasCtx3.rect(hand_boxes[index][0], hand_boxes[index][1], hand_boxes[index][2] - hand_boxes[index][0], hand_boxes[index][3] - hand_boxes[index][1]);
                canvasCtx3.lineWidth = 3;
                canvasCtx3.strokeStyle = 'green';
                canvasCtx3.stroke();
                hand_movement_counter[index] -= 1;
            }

            drawConnectors(
                canvasCtx3, landmarks, HAND_CONNECTIONS,
                {color: isRightHand ? '#00FF00' : '#FF0000', lineWidth: 5}),
                drawLandmarks(canvasCtx3, landmarks, {
                    color: isRightHand ? '#FF0000' : '#00FF00',
                    fillColor: isRightHand ? '#FF0000' : '#00FF00',
                    lineWidth: 2,
                    radius: (x) => {
                        return lerp(x.from.z, -0.15, .1, 10, 1);
                    }
                });
        }
    }
    canvasCtx3.restore();
}

const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
    }});
hands.onResults(onResultsHands);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 600,
    height: 600
});
camera.start();

new ControlPanel(controlsElement3, {
    selfieMode: true,
    maxNumHands: 2,
    minDetectionConfidence: 0.7,   // increased confidence
    minTrackingConfidence: 0.7    // increased confidence
})
    .add([
        new StaticText({title: '$mediapipe/hands'}),
        fpsControl,
        new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
        new Slider({
            title: 'Max Number of Hands',
            field: 'maxNumHands',
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
            step: 0.01,
        }),
    ])
    .on(options => {
        videoElement.classList.toggle('selfie', options.selfieMode);
        hands.setOptions(options);
    });
