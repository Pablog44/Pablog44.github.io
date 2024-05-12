import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, where, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-auth-domain",
    projectId: "tu-project-id",
    storageBucket: "tu-storage-bucket",
    messagingSenderId: "tu-sender-id",
    appId: "tu-app-id",
    measurementId: "tu-measurement-id"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Comprobar estado de autenticación
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html'; // Redireccionar a la página de inicio de sesión
    }
});

// Inicializar grupos musculares desde Firestore
function initializeMuscleGroups() {
    const muscleGroupsRef = collection(db, "muscleGroups");
    getDocs(muscleGroupsRef).then(snapshot => {
        if (snapshot.empty) {
            // Si no hay datos, inicializa con los grupos musculares predeterminados
            snapshot.forEach(doc => {
                setDoc(doc(db, "muscleGroups", "default"), initialMuscleGroups);
            });
        } else {
            snapshot.forEach(doc => {
                updateMuscleGroupOptions(doc.data());
            });
        }
    }).catch(error => {
        console.error("Error al obtener los grupos musculares:", error);
    });
}

// Actualizar opciones de grupo muscular en el DOM
function updateMuscleGroupOptions(muscleGroups) {
    muscleGroupSelect.innerHTML = '';
    Object.keys(muscleGroups).forEach(group => {
        let option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        muscleGroupSelect.appendChild(option);
    });
    updateExerciseOptions(); // Actualizar ejercicios del primer grupo disponible
}

// Actualizar opciones de ejercicios basado en el grupo seleccionado
function updateExerciseOptions() {
    const selectedGroup = muscleGroupSelect.value;
    const exercisesRef = doc(db, "muscleGroups", "default");
    getDocs(collection(db, "exercises", exercisesRef.id, selectedGroup)).then(snapshot => {
        exerciseSelect.innerHTML = '';
        snapshot.forEach(doc => {
            let exercise = doc.data().name;
            let option = document.createElement('option');
            option.value = exercise;
            option.textContent = exercise;
            exerciseSelect.appendChild(option);
        });
    }).catch(error => {
        console.error("Error al obtener ejercicios:", error);
    });
}

// Guardar ejercicio
function saveExercise() {
    const muscleGroup = muscleGroupSelect.value;
    const exercise = exerciseSelect.value;
    const weight = weightInput.value;
    const repetitions = repetitionsInput.value;
    const dateTime = exerciseDateInput.value || new Date().toISOString();

    if (muscleGroup && exercise && weight && repetitions) {
        addDoc(collection(db, "exerciseRecords"), {
            muscleGroup, exercise, weight, repetitions, dateTime
        }).then(() => {
            displayExerciseRecords();
            clearForm();
        }).catch(error => {
            console.error("Error al guardar el ejercicio:", error);
        });
    } else {
        alert("Por favor, completa todos los campos.");
    }
}

// Mostrar registros de ejercicios
function displayExerciseRecords() {
    const recordsRef = collection(db, "exerciseRecords");
    getDocs(recordsRef).then(snapshot => {
        exerciseRecordsList.innerHTML = '';
        snapshot.forEach(doc => {
            let record = doc.data();
            let listItem = document.createElement('li');
            listItem.innerHTML = `${record.dateTime} - ${record.muscleGroup}: ${record.exercise} (${record.weight} kg x ${record.repetitions} reps)
                <button onclick="deleteRecord('${doc.id}')">Eliminar</button>`;
            exerciseRecordsList.appendChild(listItem);
        });
    }).catch(error => {
        console.error("Error al mostrar registros:", error);
    });
}

// Eliminar un registro
function deleteRecord(docId) {
    deleteDoc(doc(db, "exerciseRecords", docId)).then(() => {
        displayExerciseRecords();
    }).catch(error => {
        console.error("Error al eliminar registro:", error);
    });
}

// Limpiar formulario
function clearForm() {
    weightInput.value = '';
    repetitionsInput.value = '';
    exerciseDateInput.value = '';
}

// Añadir eventos
muscleGroupSelect.addEventListener("change", updateExerciseOptions);
saveExerciseButton.addEventListener("click", saveExercise);
addMuscleGroupButton.addEventListener("click", addMuscleGroup);
addExerciseButton.addEventListener("click", addExercise);

document.addEventListener("DOMContentLoaded", () => {
    initializeMuscleGroups();
    displayExerciseRecords();
});
