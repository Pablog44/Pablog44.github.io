let pixelSize = 100;
let selectedColor = 'red';

const imageInput = document.getElementById('image-input');
const sourceCanvas = document.getElementById('source-canvas');
const outputCanvas = document.getElementById('output-canvas');
const sourceCtx = sourceCanvas.getContext('2d');
const outputCtx = outputCanvas.getContext('2d');
const downloadBtn = document.getElementById('download-btn');
const colorPalette = document.getElementById('color-palette');
const pixel100Btn = document.getElementById('pixel-100-btn');
const pixel50Btn = document.getElementById('pixel-50-btn');

imageInput.addEventListener('change', function(e) {
    createImage(e.target.files[0]);
});

pixel100Btn.addEventListener('click', function() {
    pixelSize = 100;
    if (imageInput.files[0]) {
        createImage(imageInput.files[0]);
    }
});

pixel50Btn.addEventListener('click', function() {
    pixelSize = 50;
    if (imageInput.files[0]) {
        createImage(imageInput.files[0]);
    }
});

function createImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            sourceCanvas.width = pixelSize;
            sourceCanvas.height = pixelSize;
            outputCanvas.width = pixelSize * 10;
            outputCanvas.height = pixelSize * 10;

            sourceCtx.drawImage(img, 0, 0, pixelSize, pixelSize);

            for (let y = 0; y < pixelSize; y++) {
                for(let x = 0; x < pixelSize; x++) {
                    const pixelData = sourceCtx.getImageData(x, y, 1, 1).data;
                    outputCtx.fillStyle = `rgba(${pixelData[0]},${pixelData[1]},${pixelData[2]},${pixelData[3]/255})`;
                    outputCtx.fillRect(x*10, y*10, 10, 10);
                }
            }
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

outputCanvas.addEventListener('click', function(e) {
    const rect = outputCanvas.getBoundingClientRect();
    const scaleX = outputCanvas.width / rect.width;
    const scaleY = outputCanvas.height / rect.height;
    const x = Math.floor(e.offsetX * scaleX / 10);
    const y = Math.floor(e.offsetY * scaleY / 10);
    outputCtx.fillStyle = selectedColor;
    outputCtx.fillRect(x*10, y*10, 10, 10);
});

colorPalette.addEventListener('click', function(e) {
    if (e.target.className.includes('color')) {
        document.querySelector('.selected').classList.remove('selected');
        e.target.classList.add('selected');
        selectedColor = e.target.getAttribute('data-color');
    }
});

downloadBtn.addEventListener('click', function() {
    const dataUrl = outputCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'pixelated-image.png';
    a.click();
});
