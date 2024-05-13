import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

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
const filterExerciseButton = document.getElementById('filter-exercise');
const sortCriteriaSelect = document.getElementById('sort-criteria');
const sortExerciseButton = document.getElementById('sort-exercise');
const exerciseHistoryTableBody = document.getElementById('exercise-history').querySelector('tbody');
const debugInfo = document.getElementById('debug-info');

let currentUser;
let exerciseRecords = [];

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'inicio.html';
  } else {
    currentUser = user;
    initializeMuscleGroups();
    initializeUserMuscleGroups();
    loadExerciseRecords();
  }
});

document.getElementById('logout-button').addEventListener('click', () => {
  signOut(auth)
    .then(() => {
      window.location.href = 'inicio.html';
    })
    .catch(error => {
      console.error('Error al cerrar sesión:', error);
      debugInfo.innerText = `Error al cerrar sesión: ${error}`;
    });
});

function initializeMuscleGroups() {
  const muscleGroupsRef = collection(db, "muscleGroups");

  getDocs(muscleGroupsRef)
    .then(snapshot => {
      if (snapshot.empty) {
        console.log("No se encontraron grupos musculares.");
        debugInfo.innerText = "No se encontraron grupos musculares.";
      } else {
        muscleGroupFilter.innerHTML = '<option value="">Todos</option>';
        snapshot.forEach(doc => {
          const option = document.createElement("option");
          option.textContent = doc.id;
          option.value = doc.id;
          muscleGroupFilter.appendChild(option);
        });
        // Update exercise options after loading muscle groups
        updateExerciseOptions(); 
      }
    })
    .catch(error => {
      console.error("Error cargando grupos musculares:", error);
      debugInfo.innerText = `Error cargando grupos musculares: ${error}`;
    });
}

function initializeUserMuscleGroups() {
  const userMuscleGroupsRef = collection(db, "userMuscleGroups");
  const userMuscleGroupsQuery = query(userMuscleGroupsRef, where("userId", "==", currentUser.uid));

  getDocs(userMuscleGroupsQuery)
    .then(snapshot => {
      snapshot.forEach(doc => {
        const option = document.createElement("option");
        option.textContent = `${doc.id.replace("Personalizado-", "")} (Personalizado)`;
        option.value = `Personalizado-${doc.id.replace("Personalizado-", "")}`;
        muscleGroupFilter.appendChild(option);
      });
      // Update exercise options after loading custom muscle groups
      updateExerciseOptions(); 
    })
    .catch(error => {
      console.error("Error cargando grupos musculares personalizados:", error);
      debugInfo.innerText = `Error cargando grupos musculares personalizados: ${error}`;
    });
}

function updateExerciseOptions() {
  const selectedGroup = muscleGroupFilter.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
  const isCustomGroup = muscleGroupFilter.value.includes(" (Personalizado)");
  const groupRef = isCustomGroup ? doc(db, "userMuscleGroups", `Personalizado-${selectedGroup}`) : doc(db, "muscleGroups", selectedGroup);

  getDoc(groupRef)
    .then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        exerciseFilter.innerHTML = '<option value="">Todos</option>';
        data.exercises.forEach(exercise => {
          const option = document.createElement("option");
          option.value = exercise;
          option.textContent = exercise;
          exerciseFilter.appendChild(option);
        });
      } else {
        console.log(`No se encontraron ejercicios para el grupo ${selectedGroup}`);
        debugInfo.innerText = `No se encontraron ejercicios para el grupo ${selectedGroup}.`;
      }
    })
    .catch(error => {
      console.error("Error cargando ejercicios:", error);
      debugInfo.innerText = `Error cargando ejercicios: ${error}`;
    });
}

function loadExerciseRecords() {
  const exerciseRecordsRef = collection(db, "exerciseRecords");
  const userQuery = query(exerciseRecordsRef, where("userId", "==", currentUser.uid));

  getDocs(userQuery)
    .then(snapshot => {
      exerciseRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      displayExerciseRecords(exerciseRecords);
    })
    .catch(error => {
      console.error("Error cargando registros de ejercicio:", error);
      debugInfo.innerText = `Error cargando registros de ejercicio: ${error}`;
    });
}

function displayExerciseRecords(records) {
  exerciseHistoryTableBody.innerHTML = '';
  records.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${record.muscleGroup}</td>
            <td>${record.exercise}</td>
            <td>${record.weight}</td>
            <td>${record.repetitions}</td>
            <td>${new Date(record.dateTime).toLocaleString()}</td>
        `;
    exerciseHistoryTableBody.appendChild(row);
  });
}

function filterExerciseRecords() {
  const selectedMuscleGroup = muscleGroupFilter.value;
  const selectedExercise = exerciseFilter.value;

  let filteredRecords = exerciseRecords;
  if (selectedMuscleGroup) {
    filteredRecords = filteredRecords.filter(record => record.muscleGroup === selectedMuscleGroup);
  }
  if (selectedExercise) {
    filteredRecords = filteredRecords.filter(record => record.exercise === selectedExercise);
  }

  displayExerciseRecords(filteredRecords);
}

function sortExerciseRecords() {
  const sortCriteria = sortCriteriaSelect.value;

  let sortedRecords = [...exerciseRecords];
  if (sortCriteria === 'date-desc') {
    sortedRecords.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  } else if (sortCriteria === 'date-asc') {
    sortedRecords.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  } else if (sortCriteria === 'reps-max') {
    sortedRecords.sort((a, b) => b.repetitions - a.repetitions);
  }
  displayExerciseRecords(sortedRecords);
}

// Event listeners for filter and sort buttons
filterExerciseButton.addEventListener('click', filterExerciseRecords);
sortExerciseButton.addEventListener('click', sortExerciseRecords);

// Event listener for muscle group filter to update exercise options
muscleGroupFilter.addEventListener('change', updateExerciseOptions);
