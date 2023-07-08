let selectedColor = 'red';

const imageInput = document.getElementById('image-input');
const sourceCanvas = document.getElementById('source-canvas');
const outputCanvas = document.getElementById('output-canvas');
const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const sourceCtx = sourceCanvas.getContext('2d');
const outputCtx = outputCanvas.getContext('2d');
const downloadBtn = document.getElementById('download-btn');
const colorPalette = document.getElementById('color-palette');
const colorPicker = document.getElementById('color-picker');

imageInput.addEventListener('change', function(e) {
    createImage(e.target.files[0]);
});

widthInput.addEventListener('change', function() {
    if (imageInput.files[0]) {
        createImage(imageInput.files[0]);
    }
});

heightInput.addEventListener('change', function() {
    if (imageInput.files[0]) {
        createImage(imageInput.files[0]);
    }
});

function createImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const pixelWidth = widthInput.value || 100;
            const pixelHeight = heightInput.value || 100;
            sourceCanvas.width = pixelWidth;
            sourceCanvas.height = pixelHeight;
            outputCanvas.width = pixelWidth * 10;
            outputCanvas.height = pixelHeight * 10;

            sourceCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);

            for (let y = 0; y < pixelHeight; y++) {
                for(let x = 0; x < pixelWidth; x++) {
                    const pixelData = sourceCtx.getImageData(x, y, 1, 1).data;
                    drawCircle(x, y, pixelData);
                }
            }
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

outputCanvas.addEventListener('click', function(e) {
    // Implementing click handling for a circle shape would require additional custom code
});

colorPalette.addEventListener('click', function(e) {
    if (e.target.className.includes('color')) {
        document.querySelector('.selected').classList.remove('selected');
        e.target.classList.add('selected');
        selectedColor = e.target.getAttribute('data-color');
    }
});

colorPicker.addEventListener('input', function(e) {
    selectedColor = e.target.value;
});

downloadBtn.addEventListener('click', function() {
    const dataUrl = outputCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'pixelated-image.png';
    a.click();
});

function drawCircle(x, y, pixelData) {
    outputCtx.save();
    outputCtx.fillStyle = `rgba(${pixelData[0]},${pixelData[1]},${pixelData[2]},${pixelData[3]/255})`;
    outputCtx.beginPath();
    outputCtx.arc(x*10 + 4.5, y*10 + 4.5, 4.5, 0, Math.PI * 2, false);
    outputCtx.closePath();
    outputCtx.fill();

    outputCtx.restore();

    outputCtx.strokeStyle = 'black';
    outputCtx.lineWidth = 1;
    outputCtx.beginPath();
    outputCtx.arc(x*10 + 4.5, y*10 + 4.5, 4.5, 0, Math.PI * 2, false);
    outputCtx.closePath();
    outputCtx.stroke();
}
