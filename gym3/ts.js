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

const filterMuscleGroupSelect = document.getElementById('filter-muscle-group');
const filterExerciseSelect = document.getElementById('filter-exercise');
const applyFiltersButton = document.getElementById('apply-filters');
const sortCriteriaSelect = document.getElementById('sort-criteria');
const sortResultsButton = document.getElementById('sort-results');
const resultsList = document.getElementById('results-list');
const debugInfo = document.getElementById('debug-info');

let currentUser;
let exerciseRecords = [];

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
        initializeMuscleGroups();
        loadExerciseRecords();
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
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const option = document.createElement("option");
                option.textContent = doc.id;
                option.value = doc.id;
                filterMuscleGroupSelect.appendChild(option);
            });
        }
    }).catch(error => {
        console.error("Error cargando grupos musculares:", error);
    });
}

function loadExerciseRecords() {
    const recordsRef = collection(db, "exerciseRecords");
    const userQuery = query(recordsRef, where("userId", "==", currentUser.uid));

    getDocs(userQuery).then(snapshot => {
        exerciseRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateMuscleGroupFilter();
        displayResults(exerciseRecords);
    }).catch(error => {
        console.error("Error cargando registros de ejercicios:", error);
    });
}

function populateMuscleGroupFilter() {
    const muscleGroups = [...new Set(exerciseRecords.map(record => record.muscleGroup))];
    muscleGroups.forEach(group => {
        const option = document.createElement("option");
        option.textContent = group;
        option.value = group;
        filterMuscleGroupSelect.appendChild(option);
    });
}

function populateExerciseFilter() {
    const selectedGroup = filterMuscleGroupSelect.value;
    filterExerciseSelect.innerHTML = '<option value="">Todos</option>';
    const exercises = [...new Set(exerciseRecords.filter(record => record.muscleGroup === selectedGroup).map(record => record.exercise))];
    exercises.forEach(exercise => {
        const option = document.createElement("option");
        option.textContent = exercise;
        option.value = exercise;
        filterExerciseSelect.appendChild(option);
    });
}

function applyFilters() {
    const selectedGroup = filterMuscleGroupSelect.value;
    const selectedExercise = filterExerciseSelect.value;
    let filteredRecords = exerciseRecords;

    if (selectedGroup) {
        filteredRecords = filteredRecords.filter(record => record.muscleGroup === selectedGroup);
    }
    if (selectedExercise) {
        filteredRecords = filteredRecords.filter(record => record.exercise === selectedExercise);
    }

    displayResults(filteredRecords);
}

function sortResults() {
    const sortCriteria = sortCriteriaSelect.value;
    const sortedRecords = [...exerciseRecords];

    sortedRecords.sort((a, b) => {
        if (a[sortCriteria] !== b[sortCriteria]) {
            return b[sortCriteria] -a[sortCriteria];
        }

        // Si el peso es igual, ordenamos por repeticiones
        return b.repetitions - a.repetitions;
    });

    // Aplicar filtros nuevamente antes de mostrar los resultados ordenados
    applyFilters();
    displayResults(sortedRecords);
}

function displayResults(records) {
    resultsList.innerHTML = '';

    if (records.length === 0) {
        const noResultsMessage = document.createElement('li');
        noResultsMessage.textContent = 'No se encontraron resultados.';
        resultsList.appendChild(noResultsMessage);
    } else {
        records.forEach(record => {
            const listItem = document.createElement('li');

            listItem.innerHTML = `
                <span><strong>Grupo:</strong> ${record.muscleGroup}</span>
                <span><strong>Ejercicio:</strong> ${record.exercise}</span>
                <span><strong>Peso:</strong> ${record.weight} kg</span>
                <span><strong>Repeticiones:</strong> ${record.repetitions}</span>
                <span><strong>Fecha:</strong> ${new Date(record.dateTime).toLocaleString()}</span>
            `;
            resultsList.appendChild(listItem);
        });
    }
}

applyFiltersButton.addEventListener('click', applyFilters);
sortResultsButton.addEventListener('click', sortResults);
filterMuscleGroupSelect.addEventListener('change', populateExerciseFilter);