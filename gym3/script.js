import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

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

document.addEventListener('DOMContentLoaded', function () {
    checkAuthState();
});

function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'inicio.html'; // Redirige a inicio de sesión si no está autenticado
        } else {
            initializeMuscleGroups();
            displayExerciseRecords();
        }
    });
}

function initializeMuscleGroups() {
    getDocs(collection(db, "muscleGroups")).then((snapshot) => {
        if (snapshot.empty) {
            setDoc(doc(db, "muscleGroups", "default"), initialMuscleGroups);
            updateMuscleGroupOptions(initialMuscleGroups);
        } else {
            snapshot.forEach((doc) => {
                updateMuscleGroupOptions(doc.data());
            });
        }
    });
}

function updateMuscleGroupOptions(groups) {
    muscleGroupSelect.innerHTML = '';
    Object.keys(groups).forEach((group) => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        muscleGroupSelect.appendChild(option);
    });
    updateExerciseOptions();
}

function updateExerciseOptions() {
    const selectedGroup = muscleGroupSelect.value;
    const docRef = doc(db, "muscleGroups", "default");
    getDocs(collection(db, "muscleGroups")).then((snapshot) => {
        snapshot.forEach((doc) => {
            const groups = doc.data();
            const exercises = groups[selectedGroup];
            exerciseSelect.innerHTML = '';
            exercises.forEach((exercise) => {
                const option = document.createElement('option');
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
        });
    });
}

function saveExercise() {
    const muscleGroup = muscleGroupSelect.value;
    const exercise = exerciseSelect.value;
    const weight = parseInt(weightInput.value);
    const repetitions = parseInt(repetitionsInput.value);
    const dateTime = exerciseDateInput.value || new Date().toISOString();

    if (muscleGroup && exercise && weight && repetitions) {
        addDoc(collection(db, "exercises"), {
            muscleGroup,
            exercise,
            weight,
            repetitions,
            dateTime
        }).then(() => {
            displayExerciseRecords();
            clearForm();
        }).catch(error => {
            console.error("Error adding document: ", error);
        });
    } else {
        alert("Por favor, completa todos los campos.");
    }
}

function displayExerciseRecords() {
    const exercisesRef = collection(db, "exercises");
    const q = query(exercisesRef, orderBy("dateTime"));
    getDocs(q).then((snapshot) => {
        exerciseRecordsList.innerHTML = '';
        snapshot.forEach((doc) => {
            const record = doc.data();
            const listItem = document.createElement('li');
            listItem.innerHTML = `${record.dateTime} - ${record.muscleGroup}: ${record.exercise} (${record.weight} kg x ${record.repetitions} reps)
                <button onclick="deleteRecord('${doc.id}')">Eliminar</button>`;
            exerciseRecordsList.appendChild(listItem);
        });
    });
}

function deleteRecord(id) {
    const docRef = doc(db, "exercises", id);
    deleteDoc(docRef).then(() => {
        displayExerciseRecords();
    }).catch(error => {
        console.error("Error removing document: ", error);
    });
}

function clearForm() {
    weightInput.value = '';
    repetitionsInput.value = '';
    exerciseDateInput.value = '';
}

muscleGroupSelect.addEventListener("change", updateExerciseOptions);
saveExerciseButton.addEventListener("click", saveExercise);
addMuscleGroupButton.addEventListener("click", addMuscleGroup);
addExerciseButton.addEventListener("click", addExercise);

