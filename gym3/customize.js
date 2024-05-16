import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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

const addMuscleGroupButton = document.getElementById('add-muscle-group');
const addExerciseButton = document.getElementById('add-exercise');
const muscleGroupSelect = document.getElementById('muscle-group-select');
const debugInfo = document.getElementById('debug-info');

let currentUser;

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
        loadMuscleGroups();
    }
});

function loadMuscleGroups() {
    const muscleGroupsRef = collection(db, "muscleGroups");
    const userMuscleGroupsRef = collection(db, "userMuscleGroups");

    Promise.all([getDocs(muscleGroupsRef), getDocs(query(userMuscleGroupsRef, where("userId", "==", currentUser.uid)))]).then(([nativeSnapshot, userSnapshot]) => {
        muscleGroupSelect.innerHTML = ''; // Limpiar las opciones existentes

        nativeSnapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id;
            option.value = doc.id;
            muscleGroupSelect.appendChild(option);
        });

        userSnapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id.replace("Personalizado-", "") + " (Personalizado)";
            option.value = doc.id + " (Personalizado)";
            muscleGroupSelect.appendChild(option);
        });
    }).catch(error => {
        console.error("Error cargando grupos musculares:", error);
        debugInfo.innerText = "Error cargando grupos musculares: " + error;
    });
}

function addMuscleGroup() {
    const newMuscleGroupName = document.getElementById('new-muscle-group').value.trim();
    if (newMuscleGroupName && currentUser) {
        const newGroupRef = doc(db, "userMuscleGroups", `Personalizado-${newMuscleGroupName}`);
        setDoc(newGroupRef, {
            userId: currentUser.uid,
            exercises: []
        }).then(() => {
            console.log("Nuevo grupo muscular personalizado añadido:", newMuscleGroupName);
            debugInfo.innerText = "Nuevo grupo muscular personalizado añadido: " + newMuscleGroupName;
            document.getElementById('new-muscle-group').value = ''; // Limpiar el campo de texto
            loadMuscleGroups(); // Recargar los grupos musculares
        }).catch(error => {
            console.error("Error añadiendo grupo muscular personalizado:", error);
            debugInfo.innerText = "Error añadiendo grupo muscular personalizado: " + error;
        });
    } else {
        console.log("No se introdujo nombre de grupo muscular.");
        debugInfo.innerText = "No se introdujo nombre de grupo muscular.";
    }
}

function addExercise() {
    const newExerciseName = document.getElementById('new-exercise').value.trim();
    const selectedOption = muscleGroupSelect.value;
    const muscleGroup = selectedOption.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const isCustomGroup = selectedOption.includes(" (Personalizado)");

    if (newExerciseName && muscleGroup) {
        const userExerciseRef = collection(db, "userExercises");

        addDoc(userExerciseRef, {
            userId: currentUser.uid,
            muscleGroup,
            exercise: newExerciseName,
            isCustomGroup
        }).then(() => {
            console.log("Ejercicio añadido:", newExerciseName);
            debugInfo.innerText = "Ejercicio añadido: " + newExerciseName;
            document.getElementById('new-exercise').value = ''; // Limpiar el campo de texto
        }).catch(error => {
            console.error("Error añadiendo nuevo ejercicio:", error);
            debugInfo.innerText = "Error añadiendo nuevo ejercicio: " + error;
        });
    } else {
        console.log("No se seleccionó grupo muscular o nombre de ejercicio.");
        debugInfo.innerText = "No se seleccionó grupo muscular o nombre de ejercicio.";
    }
}

addMuscleGroupButton.addEventListener('click', addMuscleGroup);
addExerciseButton.addEventListener('click', addExercise);
