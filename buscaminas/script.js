import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getFirestore, addDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFI75cfMZT5AiO1dIw2gHxZC-srIE4xJU",
  authDomain: "buscaminas-dbaed.firebaseapp.com",
  projectId: "buscaminas-dbaed",
  storageBucket: "buscaminas-dbaed.appspot.com",
  messagingSenderId: "424846500525",
  appId: "1:424846500525:web:a19a9b544197990a32dc24",
  measurementId: "G-87LX1DYVGN"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let grid = document.getElementById('grid');
let size = 20;
let totalMines = 40;
let mines = new Set();
let cells = [];
let timer = null;
let time = 0;
let visited = new Set();
let revealedCount = 0;
let gameWon = false;  // Variable added to track if the game is already won.

const baseSize = 20;
const baseMines = 40;
const mineRatio = baseMines / (baseSize * baseSize);

document.getElementById('size20').addEventListener('click', () => resetGame(20));
document.getElementById('size15').addEventListener('click', () => resetGame(15));
document.getElementById('size10').addEventListener('click', () => resetGame(10));
document.getElementById('size25').addEventListener('click', () => resetGame(25));

resetGame(size);

async function saveWinner(time) {
    const name = prompt('¡Has ganado! Ingresa tu nombre:');
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
    if (name) {
        await addDoc(collection(db, "winners" + size), {
            name: name,
            time: time,
            date: formattedDate
        });
    }
}

async function showTop100() {
    const querySnapshot = await getDocs(query(collection(db, "winners" + size), orderBy("time"), limit(100)));
    let winnersDiv = document.getElementById('winners');
    winnersDiv.innerHTML = '';
    querySnapshot.forEach((doc) => {
        winnersDiv.innerHTML += `${doc.data().name} - ${doc.data().time} - ${doc.data().date}<br/>`;
    });
}

function resetGame(newSize) {
    grid.innerHTML = '';
    cells = [];
    mines.clear();
    visited.clear();
    clearInterval(timer);
    timer = null;
    time = 0;
    revealedCount = 0;
    gameWon = false;  // Reset gameWon to false when resetting the game.
    document.getElementById('timer').textContent = time;

    size = newSize;
    totalMines = Math.floor(mineRatio * size * size);

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

    showTop100();
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

    if (!gameWon && revealedCount + mines.size === size * size) {
        clearInterval(timer);
        gameWon = true; // Set gameWon to true to avoid multiple win alerts and multiple records.
        saveWinner(time);
    }
}
