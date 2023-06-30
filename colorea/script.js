document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const clearButton = document.getElementById('clear-button');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const colors = document.querySelectorAll('.color');
    const saveButton = document.getElementById('save-button');

    let selectedColor = [0, 0, 0, 255]; // Negro

    fileInput.addEventListener('change', loadFile);

    clearButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres borrar la imagen?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });
    

    canvas.addEventListener('click', (e) => {
        const { offsetX, offsetY } = e;
        const targetColor = ctx.getImageData(offsetX, offsetY, 1, 1).data;
        floodFill(offsetX, offsetY, targetColor, selectedColor);
    });

    const colorMap = {
        'black': [0, 0, 0, 255],
        'red': [255, 0, 0, 255],
        'yellow': [255, 255, 0, 255],
        'green': [0, 128, 0, 255],
        'orange': [255, 165, 0, 255],
        'blue': [0, 0, 255, 255]
    };

    colors.forEach(color => {
        color.addEventListener('click', () => {
            selectedColor = colorMap[color.id];
        });
    });

    saveButton.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres guardar la imagen?')) {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'edited-image.png';
            link.click();
        }
    });
    function loadFile() {
        const file = fileInput.files[0];
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
    }

    function floodFill(x, y, targetColor, replacementColor) {
        if (colorMatch(targetColor, replacementColor)) return;

        const pixelStack = [[x, y]];
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const pixels = imageData.data;

        while (pixelStack.length) {
            const [x, y] = pixelStack.pop();
            const pixelIndex = (y * canvasWidth + x) * 4;

            if (!colorMatch(targetColor, pixels.slice(pixelIndex, pixelIndex + 4))) continue;

            for (let i = 0; i < 4; i++) {
                pixels[pixelIndex + i] = replacementColor[i];
            }

            const neighbors = [
                [x - 1, y],
                [x + 1, y],
                [x, y - 1],
                [x, y + 1],
            ];

            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
                    pixelStack.push([nx, ny]);
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function colorMatch(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }
});
