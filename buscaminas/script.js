const grid = document.getElementById('grid');
const size = 20;
const totalMines = 40;
const mines = new Set();
let cells = [];

while (mines.size < totalMines) {
    mines.add(Math.floor(Math.random() * size * size));
}

for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    if (mines.has(i)) {
        cell.classList.add('mine');
    }
    cell.addEventListener('click', () => {
        if (cell.classList.contains('mine')) {
            cell.style.backgroundColor = 'red';
            alert('¡BOOM! Has perdido.');
            location.reload();
        } else {
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
        }
    });
    cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        cell.textContent = '🚩';
    });
    cells.push(cell);
    grid.appendChild(cell);
}
