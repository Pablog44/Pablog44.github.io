import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB8sWu3ZG6NWvlEKQHRi23c7CgPPy_6yag",
    authDomain: "apuntagym.firebaseapp.com",
    projectId: "apuntagym",
    storageBucket: "apuntagym.appspot.com",
    messagingSenderId: "522093591127",
    appId: "1:522093591127:web:27e2e56085d50c85b18112",
    measurementId: "G-PY9MT94G92"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Variables generales
let currentUser = null;

// Variables DOM
const loginButton = document.getElementById("login-google");
const logoutButton = document.getElementById("logout");
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

// Función para inicializar los grupos musculares en Firestore
async function initializeMuscleGroups() {
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        await setDoc(userDocRef, { muscleGroups: initialMuscleGroups, exerciseRecords: [] });
    }

    updateMuscleGroupOptions();
}

// Actualiza las opciones de los grupos musculares
async function updateMuscleGroupOptions() {
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const muscleGroups = userDocSnap.data().muscleGroups;
        muscleGroupSelect.innerHTML = "";
        for (const group in muscleGroups) {
            const option = document.createElement("option");
            option.value = group;
            option.textContent = group;
            muscleGroupSelect.appendChild(option);
        }

        updateExerciseOptions();
    }
}

// Actualiza las opciones de ejercicio según el grupo muscular seleccionado
async function updateExerciseOptions() {
    if (!currentUser) return;

    const selectedGroup = muscleGroupSelect.value;
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const muscleGroups = userDocSnap.data().muscleGroups;
        const exercises = muscleGroups[selectedGroup] || [];

        exerciseSelect.innerHTML = "";
        exercises.forEach(exercise => {
            const option = document.createElement("option");
            option.value = exercise;
            option.textContent = exercise;
            exerciseSelect.appendChild(option);
        });
    }
}

// Guarda el ejercicio en el historial y en Firestore
async function saveExercise() {
    if (!currentUser) return;

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

        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const exerciseRecords = userDocSnap.data().exerciseRecords || [];
            exerciseRecords.push(record);
            await updateDoc(userDocRef, { exerciseRecords });
            displayExerciseRecords(exerciseRecords);
            clearForm();
        }
    } else {
        alert("Por favor, completa todos los campos.");
    }
}

// Muestra el historial de ejercicios
async function displayExerciseRecords(records = null) {
    if (!currentUser) return;

    if (!records) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        records = userDocSnap.exists() ? userDocSnap.data().exerciseRecords || [] : [];
    }

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
async function deleteRecord(index) {
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const exerciseRecords = userDocSnap.data().exerciseRecords || [];
        exerciseRecords.splice(index, 1);
        await updateDoc(userDocRef, { exerciseRecords });
        displayExerciseRecords(exerciseRecords);
    }
}

// Añade un nuevo grupo muscular
async function addMuscleGroup() {
    if (!currentUser) return;

    const newGroup = newMuscleGroupInput.value.trim();
    if (newGroup) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const muscleGroups = userDocSnap.data().muscleGroups || {};
            if (!muscleGroups[newGroup]) {
                muscleGroups[newGroup] = [];
                await updateDoc(userDocRef, { muscleGroups });
                updateMuscleGroupOptions();
                newMuscleGroupInput.value = "";
            } else {
                alert("El grupo muscular ya existe.");
            }
        }
    } else {
        alert("Por favor, introduce un nombre para el grupo muscular.");
    }
}

// Añade un nuevo ejercicio al grupo muscular seleccionado
async function addExercise() {
    if (!currentUser) return;

    const selectedGroup = muscleGroupSelect.value;
    const newExercise = newExerciseInput.value.trim();
    if (selectedGroup && newExercise) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const muscleGroups = userDocSnap.data().muscleGroups || {};
            if (muscleGroups[selectedGroup] && !muscleGroups[selectedGroup].includes(newExercise)) {
                muscleGroups[selectedGroup].push(newExercise);
                await updateDoc(userDocRef, { muscleGroups });
                updateExerciseOptions();
                newExerciseInput.value = "";
            } else {
                alert("El ejercicio ya existe en ese grupo muscular.");
            }
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

// Iniciar sesión con Google
loginButton.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        loginButton.classList.add("hidden");
        logoutButton.classList.remove("hidden");
        initializeMuscleGroups();
        displayExerciseRecords();
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
    }
});

// Cerrar sesión
logoutButton.addEventListener("click", async () => {
    try {
        await signOut(auth);
        currentUser = null;
        loginButton.classList.remove("hidden");
        logoutButton.classList.add("hidden");
        muscleGroupSelect.innerHTML = "";
        exerciseSelect.innerHTML = "";
        exerciseRecordsList.innerHTML = "";
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});

// Mantén al usuario autenticado entre recargas de la página
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginButton.classList.add("hidden");
        logoutButton.classList.remove("hidden");
        initializeMuscleGroups();
        displayExerciseRecords();
    } else {
        currentUser = null;
        loginButton.classList.remove("hidden");
        logoutButton.classList.add("hidden");
        muscleGroupSelect.innerHTML = "";
        exerciseSelect.innerHTML = "";
        exerciseRecordsList.innerHTML = "";
    }
});

// Inicializa los eventos y la pantalla
function initializeApp() {
    muscleGroupSelect.addEventListener("change", updateExerciseOptions);
    saveExerciseButton.addEventListener("click", saveExercise);
    addMuscleGroupButton.addEventListener("click", addMuscleGroup);
    addExerciseButton.addEventListener("click", addExercise);
}

// Inicializar la aplicación
initializeApp();