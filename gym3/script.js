// Import Firebase modules at the beginning of your script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB8sWu3ZG6NWvlEKQHRi23c7CgPPy_6yag",
    authDomain: "apuntagym.firebaseapp.com",
    projectId: "apuntagym",
    storageBucket: "apuntagym.appspot.com",
    messagingSenderId: "522093591127",
    appId: "1:522093591127:web:27e2e56085d50c85b18112",
    measurementId: "G-PY9MT94G92"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

document.getElementById('login').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => {
        alert(`Error de autenticación: ${error.message}`);
    });
});

document.getElementById('logout').addEventListener('click', () => {
    signOut(auth).then(() => {
        alert('Has cerrado sesión con éxito.');
        window.location.reload();
    }).catch(error => {
        console.error('Error al cerrar sesión:', error);
    });
});

onAuthStateChanged(auth, user => {
    if (user) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('form-section').style.display = '';
        document.getElementById('custom-section').style.display = '';
        document.getElementById('records-section').style.display = '';
        document.getElementById('logout').style.display = '';
    } else {
        document.getElementById('login-container').style.display = '';
        document.getElementById('form-section').style.display = 'none';
        document.getElementById('custom-section').style.display = 'none';
        document.getElementById('records-section').style.display = 'none';
        document.getElementById('logout').style.display = 'none';
    }
});

// Variables
const muscleGroupSelect = document.getElementById("muscle-group");
const exerciseSelect = document.getElementById("exercise");
const weightInput = document.getElementById("weight");
const repetitionsInput = document.getElementById("repetitions");
const exerciseDateInput = document.getElementById("exercise-date");
const saveExerciseButton = document.getElementById("save-exercise");

const newMuscleGroupInput = document.getElementById("new-muscle-group");
const addMuscleGroupButton = document.getElementById("add-muscle-group");
const newExerciseInput = document.getElementById("new-exercise");
const addExerciseButton = document.getElementById("add-exercise");

const exerciseRecordsList = document.getElementById("exercise-records");

const initialMuscleGroups = {
    "Pecho": ["Press Banca", "Press Inclinado", "Aperturas"],
    "Espalda": ["Dominadas", "Remo con Barra", "Jalón al Pecho"],
    "Brazos": ["Curl con Barra", "Tríceps Fondo", "Martillo"],
    "Piernas": ["Sentadilla", "Prensa", "Peso Muerto"],
    "Hombros": ["Press Militar", "Elevaciones Laterales", "Pájaro"]
};

// Función para inicializar los grupos musculares
function initializeMuscleGroups() {
    const storedGroups = JSON.parse(localStorage.getItem("muscleGroups")) || initialMuscleGroups;
    localStorage.setItem("muscleGroups", JSON.stringify(storedGroups));
    updateMuscleGroupOptions();
}

// Actualiza las opciones de los grupos musculares
function updateMuscleGroupOptions() {
    const muscleGroups = JSON.parse(localStorage.getItem("muscleGroups"));
    muscleGroupSelect.innerHTML = "";
    for (const group in muscleGroups) {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        muscleGroupSelect.appendChild(option);
    }
    updateExerciseOptions();
}

// Actualiza las opciones de ejercicio según el grupo muscular seleccionado
function updateExerciseOptions() {
    const selectedGroup = muscleGroupSelect.value;
    const muscleGroups = JSON.parse(localStorage.getItem("muscleGroups"));
    const exercises = muscleGroups[selectedGroup] || [];

    exerciseSelect.innerHTML = "";
    exercises.forEach(exercise => {
        const option = document.createElement("option");
        option.value = exercise;
        option.textContent = exercise;
        exerciseSelect.appendChild(option);
    });
}

// Guarda el ejercicio en el historial y en el localStorage
function saveExercise() {
    const muscleGroup = muscleGroupSelect.value;
    const exercise = exerciseSelect.value;
    const weight = weightInput.value;
    const repetitions = repetitionsInput.value;
    const dateTime = exerciseDateInput.value || new Date().toISOString().slice(0, 16);

    if (muscleGroup && exercise && weight && repetitions) {
        const record = {
            muscleGroup,
            exercise,
            weight,
            repetitions,
            dateTime
        };

        const records = JSON.parse(localStorage.getItem("exerciseRecords")) || [];
        records.push(record);
        localStorage.setItem("exerciseRecords", JSON.stringify(records));
        displayExerciseRecords();
        clearForm();
    } else {
        alert("Por favor, completa todos los campos.");
    }
}

// Muestra el historial de ejercicios
function displayExerciseRecords() {
    const records = JSON.parse(localStorage.getItem("exerciseRecords")) || [];
    exerciseRecordsList.innerHTML = "";
    records.forEach((record, index) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            <span>${record.dateTime} - ${record.muscleGroup}: ${record.exercise} (${record.weight} kg x ${record.repetitions} reps)</span>
            <button onclick="deleteRecord(${index})">Eliminar</button>
        `;
        exerciseRecordsList.appendChild(listItem);
    });
}

// Elimina un registro del historial
function deleteRecord(index) {
    const records = JSON.parse(localStorage.getItem("exerciseRecords")) || [];
    records.splice(index, 1);
    localStorage.setItem("exerciseRecords", JSON.stringify(records));
    displayExerciseRecords();
}

// Añade un nuevo grupo muscular
function addMuscleGroup() {
    const newGroup = newMuscleGroupInput.value.trim();
    if (newGroup) {
        const muscleGroups = JSON.parse(localStorage.getItem("muscleGroups")) || {};
        if (!muscleGroups[newGroup]) {
            muscleGroups[newGroup] = [];
            localStorage.setItem("muscleGroups", JSON.stringify(muscleGroups));
            updateMuscleGroupOptions();
            newMuscleGroupInput.value = "";
        } else {
            alert("El grupo muscular ya existe.");
        }
    } else {
        alert("Por favor, introduce un nombre para el grupo muscular.");
    }
}

// Añade un nuevo ejercicio al grupo muscular seleccionado
function addExercise() {
    const selectedGroup = muscleGroupSelect.value;
    const newExercise = newExerciseInput.value.trim();
    if (selectedGroup && newExercise) {
        const muscleGroups = JSON.parse(localStorage.getItem("muscleGroups")) || {};
        if (muscleGroups[selectedGroup] && !muscleGroups[selectedGroup].includes(newExercise)) {
            muscleGroups[selectedGroup].push(newExercise);
            localStorage.setItem("muscleGroups", JSON.stringify(muscleGroups));
            updateExerciseOptions();
            newExerciseInput.value = "";
        } else {
            alert("El ejercicio ya existe en ese grupo muscular.");
        }
    } else {
        alert("Por favor, selecciona un grupo muscular e introduce el nombre del ejercicio.");
    }
}

// Limpia el formulario después de guardar un ejercicio
function clearForm() {
    weightInput.value = "";
    repetitionsInput.value = "";
    exerciseDateInput.value = "";
}

// Inicializa los eventos y la pantalla
function initializeApp() {
    initializeMuscleGroups();
    displayExerciseRecords();

    muscleGroupSelect.addEventListener("change", updateExerciseOptions);
    saveExerciseButton.addEventListener("click", saveExercise);
    addMuscleGroupButton.addEventListener("click", addMuscleGroup);
    addExerciseButton.addEventListener("click", addExercise);
}

// Inicializar la aplicación
initializeApp();