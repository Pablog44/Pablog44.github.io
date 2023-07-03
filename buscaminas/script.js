let grid = document.getElementById('grid');
let size = 20;
let totalMines = 40;
let mines = new Set();
let cells = [];
let timer = null;
let time = 0;
let visited = new Set();
let revealedCount = 0;

const baseSize = 20;
const baseMines = 40;
const mineRatio = baseMines / (baseSize * baseSize);  // Calcula la proporción de minas

document.getElementById('size20').addEventListener('click', () => resetGame(20));
document.getElementById('size15').addEventListener('click', () => resetGame(15));
document.getElementById('size10').addEventListener('click', () => resetGame(10));
document.getElementById('size25').addEventListener('click', () => resetGame(25));

resetGame(size);

function resetGame(newSize) {
    grid.innerHTML = '';
    cells = [];
    mines.clear();
    visited.clear();
    clearInterval(timer);
    timer = null;
    time = 0;
    revealedCount = 0;
    document.getElementById('timer').textContent = time;

    size = newSize;
    totalMines = Math.floor(mineRatio * size * size);  // Calcula las nuevas minas

    while (mines.size < totalMines) {
        mines.add(Math.floor(Math.random() * size * size));
    }

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        if (mines.has(i)) {
            cell.classList.add('mine');
        }
        cells.push(cell);
        grid.appendChild(cell);
    }

    grid.style.gridTemplateColumns = `repeat(${size}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${size}, 40px)`;

    cells.forEach((cell, i) => {
        cell.addEventListener('click', (e) => {
            if (!timer) {
                timer = setInterval(() => {
                    time++;
                    document.getElementById('timer').textContent = time;
                }, 1000);
            }
            reveal(i);
        });

        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            cell.textContent = '🚩';
        });
    });
}

document.getElementById('reset').addEventListener('click', () => resetGame(size));

function reveal(i) {
    if (visited.has(i)) {
        return;
    }
    visited.add(i);
    revealedCount++;
    const cell = cells[i];
    if (cell.classList.contains('mine')) {
        clearInterval(timer);
        cell.style.backgroundColor = 'red';
        alert('¡BOOM! Has perdido.');
        return;
    }
    let count = 0;
    const row = Math.floor(i / size);
    const col = i % size;
    for (let r = Math.max(row - 1, 0); r <= Math.min(row + 1, size - 1); r++) {
        for (let c = Math.max(col - 1, 0); c <= Math.min(col + 1, size - 1); c++) {
            if (cells[r * size + c].classList.contains('mine')) {
                count++;
            }
        }
    }
    cell.textContent = count || '';
    cell.style.backgroundColor = 'lightgreen';
    if (count === 0) {
        for (let r = Math.max(row - 1, 0); r <= Math.min(row + 1, size - 1); r++) {
            for (let c = Math.max(col - 1, 0); c <= Math.min(col + 1, size - 1); c++) {
                reveal(r * size + c);
            }
        }
    }

    // Comprobar si el jugador ha ganado
    if (revealedCount + mines.size === size * size) {
        clearInterval(timer);
        alert('¡Has ganado!');
    }
}
