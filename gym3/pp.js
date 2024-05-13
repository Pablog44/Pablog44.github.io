import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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

const muscleGroupSelect = document.getElementById('filter-muscle-group');
const exerciseSelect = document.getElementById('filter-exercise');
const resultsBody = document.getElementById('results-body');
const debugInfo = document.getElementById('debug-info');

let currentUser;
let muscleGroups = {};

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
        debugInfo.innerText = "Error al cerrar sesión: " + error;
    });
});

function initializeMuscleGroups() {
    const muscleGroupsRef = collection(db, "muscleGroups");
    getDocs(muscleGroupsRef).then(snapshot => {
        snapshot.forEach(doc => {
            muscleGroups[doc.id] = doc.data().exercises;
        });
        initializeUserMuscleGroups();
    }).catch(error => {
        console.error("Error cargando grupos musculares:", error);
        debugInfo.innerText = "Error cargando grupos musculares: " + error;
    });
}

function initializeUserMuscleGroups() {
    const userMuscleGroupsRef = collection(db, "userMuscleGroups");
    const userMuscleGroupsQuery = query(userMuscleGroupsRef, where("userId", "==", currentUser.uid));
    getDocs(userMuscleGroupsQuery).then(snapshot => {
        snapshot.forEach(doc => {
            muscleGroups[doc.id.replace("Personalizado-", "")] = doc.data().exercises;
        });
        populateMuscleGroupOptions();
    }).catch(error => {
        console.error("Error cargando grupos musculares personalizados:", error);
        debugInfo.innerText = "Error cargando grupos musculares personalizados: " + error;
    });
}

function populateMuscleGroupOptions() {
    muscleGroupSelect.innerHTML = '<option value="">Todos</option>';
    Object.keys(muscleGroups).forEach(group => {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        muscleGroupSelect.appendChild(option);
    });
    muscleGroupSelect.addEventListener('change', updateExerciseOptions);
    updateExerciseOptions();
}

function updateExerciseOptions() {
    const selectedGroup = muscleGroupSelect.value;
    exerciseSelect.innerHTML = '<option value="">Todos</option>';
    if (selectedGroup && muscleGroups[selectedGroup]) {
        muscleGroups[selectedGroup].forEach(exercise => {
            const option = document.createElement("option");
            option.value = exercise;
            option.textContent = exercise;
            exerciseSelect.appendChild(option);
        });
    }
}

function fetchExerciseRecords() {
    const selectedGroup = muscleGroupSelect.value;
    const selectedExercise = exerciseSelect.value;

    let recordsQuery = query(collection(db, "exerciseRecords"), where("userId", "==", currentUser.uid));
    
    if (selectedGroup) {
        recordsQuery = query(recordsQuery, where("muscleGroup", "==", selectedGroup));
    }

    if (selectedExercise) {
        recordsQuery = query(recordsQuery, where("exercise", "==", selectedExercise));
    }

    recordsQuery = query(recordsQuery, orderBy("weight", "desc"), orderBy("repetitions", "desc"));

    getDocs(recordsQuery).then(snapshot => {
        resultsBody.innerHTML = '';
        snapshot.forEach(doc => {
            const record = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.muscleGroup.replace("Personalizado-", "")}</td>
                <td>${record.exercise}</td>
                <td>${record.weight}</td>
                <td>${record.repetitions}</td>
                <td>${new Date(record.dateTime).toLocaleString()}</td>
            `;
            resultsBody.appendChild(row);
        });
        debugInfo.innerText = "Resultados cargados.";
    }).catch(error => {
        console.error("Error cargando registros de ejercicios:", error);
        debugInfo.innerText = "Error cargando registros de ejercicios: " + error;
    });
}

document.getElementById('filter-button').addEventListener('click', fetchExerciseRecords);