const imageInput = document.getElementById('image-input');
const sourceCanvas = document.getElementById('source-canvas');
const outputCanvas = document.getElementById('output-canvas');
const ctxSource = sourceCanvas.getContext('2d');
const ctxOutput = outputCanvas.getContext('2d');
const downloadBtn = document.getElementById('download-btn');

imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const pixelSize = 10;
            const gridSize = 1;
            const size = 100 * (pixelSize + gridSize);
            sourceCanvas.width = 100;
            sourceCanvas.height = 100;
            outputCanvas.width = size;
            outputCanvas.height = size;
            ctxSource.drawImage(img, 0, 0, 100, 100);
            for(let y = 0; y < 100; y++) {
                for(let x = 0; x < 100; x++) {
                    const pixelData = ctxSource.getImageData(x, y, 1, 1).data;
                    ctxOutput.fillStyle = `rgba(${pixelData[0]},${pixelData[1]},${pixelData[2]},${pixelData[3]/255})`;
                    ctxOutput.fillRect(x * (pixelSize + gridSize), y * (pixelSize + gridSize), pixelSize, pixelSize);
                }
            }
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
});

downloadBtn.addEventListener('click', function() {
    const dataUrl = outputCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'pixelated-image.png';
    a.click();
});
