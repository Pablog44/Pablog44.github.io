const grid = document.getElementById('grid');
const size = 20;
const totalMines = 40;
const mines = new Set();
let cells = [];
let timer = null;
let time = 0;
let visited = new Set();

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

document.getElementById('reset').addEventListener('click', () => location.reload());

function reveal(i) {
    if (visited.has(i)) {
        return;
    }
    visited.add(i);
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
}
