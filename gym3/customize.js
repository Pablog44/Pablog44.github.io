import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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
const debugInfo = document.getElementById('debug-info');

let currentUser;

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
    }
});

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
    const muscleGroup = document.getElementById('muscle-group').value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const isCustomGroup = document.getElementById('muscle-group').value.includes(" (Personalizado)");

    const groupRef = isCustomGroup ? doc(db, "userMuscleGroups", `Personalizado-${muscleGroup}`) : doc(db, "muscleGroups", muscleGroup);

    if (newExerciseName && muscleGroup) {
        getDoc(groupRef).then(docSnap => {
            if (docSnap.exists()) {
                const exercises = docSnap.data().exercises;
                if (!exercises.includes(newExerciseName)) {
                    exercises.push(newExerciseName);
                    setDoc(groupRef, { exercises }, { merge: true }).then(() => {
                        console.log("Ejercicio añadido:", newExerciseName);
                        debugInfo.innerText = "Ejercicio añadido: " + newExerciseName;
                        document.getElementById('new-exercise').value = ''; // Limpiar el campo de texto
                    }).catch(error => {
                        console.error("Error añadiendo nuevo ejercicio:", error);
                        debugInfo.innerText = "Error añadiendo nuevo ejercicio: " + error;
                    });
                } else {
                    console.log("El ejercicio ya existe:", newExerciseName);
                    debugInfo.innerText = "El ejercicio ya existe: " + newExerciseName;
                }
            } else {
                console.log(`El grupo muscular ${isCustomGroup ? 'personalizado' : ''} no existe:`, muscleGroup);
                debugInfo.innerText = `El grupo muscular ${isCustomGroup ? 'personalizado' : ''} no existe: ${muscleGroup}`;
            }
        }).catch(error => {
            console.error("Error obteniendo grupo muscular:", error);
            debugInfo.innerText = `Error obteniendo grupo muscular: ${error}`;
        });
    } else {
        console.log("No se seleccionó grupo muscular o nombre de ejercicio.");
        debugInfo.innerText = "No se seleccionó grupo muscular o nombre de ejercicio.";
    }
}

addMuscleGroupButton.addEventListener('click', addMuscleGroup);
addExerciseButton.addEventListener('click', addExercise);
