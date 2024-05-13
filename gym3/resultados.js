import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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

const muscleGroupSelect = document.getElementById('muscle-group-select');
const exerciseSelect = document.getElementById('exercise-select');
const resultsContainer = document.getElementById('results-container');

let currentUser;

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
        muscleGroupSelect.innerHTML = '<option value="">Seleccione un grupo muscular</option>';
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = doc.id;
            muscleGroupSelect.appendChild(option);
        });
    }).catch(error => {
        console.error("Error al cargar los grupos musculares:", error);
    });

    const userMuscleGroupsRef = query(collection(db, "userMuscleGroups"), where("userId", "==", currentUser.uid));
    getDocs(userMuscleGroupsRef).then(snapshot => {
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.value = doc.id.replace("Personalizado-", "");
            option.textContent = `${doc.id.replace("Personalizado-", "")} (Personalizado)`;
            muscleGroupSelect.appendChild(option);
        });
    }).catch(error => {
        console.error("Error al cargar los grupos musculares del usuario:", error);
    });
}

muscleGroupSelect.addEventListener('change', () => {
    const selectedGroup = muscleGroupSelect.value;
    updateExerciseOptions(selectedGroup);
});

exerciseSelect.addEventListener('change', () => {
    const selectedGroup = muscleGroupSelect.value;
    const selectedExercise = exerciseSelect.value;
    displayResults(selectedGroup, selectedExercise);
});

function updateExerciseOptions(muscleGroup) {
    if (!muscleGroup) return;
    const isCustom = muscleGroup.includes("(Personalizado)");
    const groupRef = isCustom ? doc(db, "userMuscleGroups", `Personalizado-${muscleGroup.replace(" (Personalizado)", "")}`) : doc(db, "muscleGroups", muscleGroup);

    getDoc(groupRef).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            exerciseSelect.innerHTML = '<option value="">Seleccione un ejercicio</option>';
            data.exercises.forEach(exercise => {
                const option = document.createElement("option");
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
        }
    }).catch(error => {
        console.error("Error al cargar ejercicios:", error);
    });
}

function displayResults(muscleGroup, exercise) {
    if (!muscleGroup || !exercise) return;
    const isCustomGroup = muscleGroup.includes("(Personalizado)");
    const exerciseRecordsRef = query(collection(db, "exerciseRecords"), where("userId", "==", currentUser.uid), where("muscleGroup", "==", isCustomGroup ? `Personalizado-${muscleGroup.replace(" (Personalizado)", "")}` : muscleGroup), where("exercise", "==", exercise));
    getDocs(exerciseRecordsRef).then(snapshot => {
        resultsContainer.innerHTML = '';
        if (snapshot.empty) {
            resultsContainer.textContent = "No se encontraron resultados.";
            return;
        }
        const results = snapshot.docs.map(doc => doc.data()).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        results.forEach(result => {
            const resultElement = document.createElement("div");
            resultElement.classList.add("result");
            resultElement.innerHTML = `<strong>Fecha:</strong> ${new Date(result.dateTime).toLocaleString()}<br><strong>Peso:</strong> ${result.weight} kg<br><strong>Repeticiones:</strong> ${result.repetitions}`;
            resultsContainer.appendChild(resultElement);
        });
    }).catch(error => {
        console.error("Error al mostrar resultados:", error);
    });
}