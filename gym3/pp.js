import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);

const muscleGroupFilter = document.getElementById('muscle-group-filter');
const exerciseFilter = document.getElementById('exercise-filter');
const exerciseList = document.getElementById('exercise-list');
const debugInfo = document.getElementById('debug-info');

let currentUser;
let exerciseRecords = [];

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
        initializeMuscleGroups();
    }
});

document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'inicio.html';
    }).catch(error => {
        console.error('Error al cerrar sesión:', error);
    });
});

function initializeMuscleGroups() {
    const muscleGroupsRef = collection(db, "muscleGroups");
    getDocs(muscleGroupsRef).then(snapshot => {
        muscleGroupFilter.innerHTML = '<option value="">Todos</option>';
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id;
            option.value = doc.id;
            muscleGroupFilter.appendChild(option);
        });

        initializeUserMuscleGroups();
    }).catch(error => {
        console.error("Error cargando grupos musculares:", error);
    });
}

function initializeUserMuscleGroups() {
    const userMuscleGroupsRef = collection(db, "userMuscleGroups");
    const userMuscleGroupsQuery = query(userMuscleGroupsRef, where("userId", "==", currentUser.uid));
    getDocs(userMuscleGroupsQuery).then(snapshot => {
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = `${doc.id.replace("Personalizado-", "")} (Personalizado)`;
            option.value = doc.id;
            muscleGroupFilter.appendChild(option);
        });

        loadExerciseRecords();
    }).catch(error => {
        console.error("Error cargando grupos musculares personalizados:", error);
    });
}

function loadExerciseRecords() {
    const exerciseRecordsRef = collection(db, "exerciseRecords");
    const userExerciseRecordsQuery = query(exerciseRecordsRef, where("userId", "==", currentUser.uid));
    getDocs(userExerciseRecordsQuery).then(snapshot => {
        exerciseRecords = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        populateExerciseOptions();
        displayExerciseRecords(exerciseRecords);
    }).catch(error => {
        console.error("Error cargando registros de ejercicios:", error);
    });
}

function populateExerciseOptions() {
    const selectedGroup = muscleGroupFilter.value;
    const relevantExercises = exerciseRecords
        .filter(record => !selectedGroup || record.muscleGroup === selectedGroup)
        .map(record => record.exercise);

    const uniqueExercises = [...new Set(relevantExercises)];

    exerciseFilter.innerHTML = '<option value="">Todos</option>';
    uniqueExercises.forEach(exercise => {
        const option = document.createElement("option");
        option.value = exercise;
        option.textContent = exercise;
        exerciseFilter.appendChild(option);
    });
}

function displayExerciseRecords(records) {
    exerciseList.innerHTML = '';

    if (records.length === 0) {
        exerciseList.innerHTML = '<li>No se encontraron registros.</li>';
        return;
    }

    records.forEach(record => {
        const listItem = document.createElement('li');
        listItem.textContent = `${record.muscleGroup} - ${record.exercise}: ${record.weight} kg, ${record.repetitions} reps (${new Date(record.dateTime).toLocaleString()})`;
        exerciseList.appendChild(listItem);
    });
}

function filterExerciseRecords() {
    const selectedGroup = muscleGroupFilter.value;
    const selectedExercise = exerciseFilter.value;

    const filteredRecords = exerciseRecords.filter(record => {
        const matchesGroup = !selectedGroup || record.muscleGroup === selectedGroup;
        const matchesExercise = !selectedExercise || record.exercise === selectedExercise;
        return matchesGroup && matchesExercise;
    });

    displayExerciseRecords(filteredRecords);
}

function sortExerciseRecords() {
    const sortedRecords = exerciseRecords.sort((a, b) => {
        if (a.weight !== b.weight) {
            return b.weight - a.weight; // Ordenar por peso descendente
        } else {
            return b.repetitions - a.repetitions; // Ordenar por repeticiones descendente
        }
    });

    filterExerciseRecords(sortedRecords);
}

muscleGroupFilter.addEventListener('change', populateExerciseOptions);
document.getElementById('filter-exercises').addEventListener('click', filterExerciseRecords);
document.getElementById('sort-exercises').addEventListener('click', sortExerciseRecords);