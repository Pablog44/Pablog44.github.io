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
            const pixelWidth = widthInput.value || 100;  // Use default value if not set
            const pixelHeight = heightInput.value || 100;  // Use default value if not set
            sourceCanvas.width = pixelWidth;
            sourceCanvas.height = pixelHeight;
            outputCanvas.width = pixelWidth * 10;
            outputCanvas.height = pixelHeight * 10;

            sourceCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);

            for (let y = 0; y < pixelHeight; y++) {
                for(let x = 0; x < pixelWidth; x++) {
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
