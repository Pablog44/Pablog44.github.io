import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, setDoc, query, where, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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

const muscleGroupSelect = document.getElementById('muscle-group');
const exerciseSelect = document.getElementById('exercise');
const weightInput = document.getElementById('weight');
const repetitionsInput = document.getElementById('repetitions');
const exerciseDateInput = document.getElementById('exercise-date');
const saveExerciseButton = document.getElementById('save-exercise');
const addMuscleGroupButton = document.getElementById('add-muscle-group');
const addExerciseButton = document.getElementById('add-exercise');
const exerciseRecordsList = document.getElementById('exercise-records');
const debugInfo = document.getElementById('debug-info');

let currentUser;

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
        initializeMuscleGroups();
        displayExerciseRecords();
    }
});

document.getElementById('logout-button').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'inicio.html';
    }).catch((error) => {
        console.error('Error al cerrar sesión:', error);
    });
});

function initializeMuscleGroups() {
    const muscleGroupsRef = collection(db, "muscleGroups");
    getDocs(muscleGroupsRef).then(snapshot => {
        if (snapshot.empty) {
            console.log("No se encontraron grupos musculares, inicializando grupos predeterminados.");
            debugInfo.innerText = "Inicializando grupos musculares por defecto...";
            initializeDefaultMuscleGroups(muscleGroupsRef);
        } else {
            console.log("Grupos musculares encontrados:", snapshot.docs.map(doc => doc.id));
            debugInfo.innerText = "Grupos musculares cargados: " + snapshot.docs.map(doc => doc.id).join(", ");
            muscleGroupSelect.innerHTML = ''; // Limpiar las opciones existentes
            snapshot.forEach(doc => {
                const option = document.createElement("option");
                option.textContent = doc.id;
                option.value = doc.id;
                muscleGroupSelect.appendChild(option);
            });
            updateExerciseOptions();
        }
    }).catch(error => {
        console.error("Error cargando grupos musculares:", error);
        debugInfo.innerText = "Error cargando grupos musculares: " + error;
    });
}

function initializeDefaultMuscleGroups(muscleGroupsRef) {
    const initialGroups = {
        Pecho: ['Press Banca', 'Press Inclinado', 'Aperturas'],
        Espalda: ['Dominadas', 'Remo con Barra', 'Jalón al Pecho'],
        Brazos: ['Curl con Barra', 'Tríceps Fondo', 'Martillo'],
        Piernas: ['Sentadilla', 'Prensa', 'Peso Muerto'],
        Hombros: ['Press Militar', 'Elevaciones Laterales', 'Pájaro']
    };
    const promises = [];
    Object.keys(initialGroups).forEach(group => {
        const promise = setDoc(doc(muscleGroupsRef, group), { exercises: initialGroups[group] });
        promises.push(promise);
    });

    Promise.all(promises).then(() => {
        console.log("Grupos musculares predeterminados inicializados.");
        initializeMuscleGroups(); // Recargar los grupos musculares
    }).catch(error => {
        console.error("Error inicializando grupos musculares predeterminados:", error);
    });
}

function updateExerciseOptions() {
    const selectedGroup = muscleGroupSelect.value;
    if (!selectedGroup) return; // Si no hay grupo seleccionado, no intentamos cargar ejercicios

    const groupRef = doc(db, "muscleGroups", selectedGroup);
    getDoc(groupRef).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            exerciseSelect.innerHTML = ''; // Limpiar las opciones anteriores
            data.exercises.forEach(exercise => {
                const option = document.createElement("option");
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
        } else {
            console.log(`No se encontraron ejercicios para el grupo ${selectedGroup}`);
            debugInfo.innerText = "No se encontraron ejercicios para el grupo seleccionado.";
        }
    }).catch(error => {
        console.error("Error cargando ejercicios:", error);
        debugInfo.innerText = "Error cargando ejercicios: " + error;
    });
}

function addMuscleGroup() {
    const newMuscleGroupName = document.getElementById('new-muscle-group').value.trim();
    if (newMuscleGroupName) {
        setDoc(doc(db, "muscleGroups", newMuscleGroupName), { exercises: [] }).then(() => {
            console.log("Nuevo grupo muscular añadido:", newMuscleGroupName);
            debugInfo.innerText = "Nuevo grupo muscular añadido: " + newMuscleGroupName;
            muscleGroupSelect.innerHTML = ''; // Limpiar las opciones existentes
            initializeMuscleGroups();
        }).catch(error => {
            console.error("Error añadiendo grupo muscular:", error);
            debugInfo.innerText = "Error añadiendo grupo muscular: " + error;
        });
    } else {
        console.log("No se introdujo nombre de grupo muscular.");
        debugInfo.innerText = "No se introdujo nombre de grupo muscular.";
    }
}

function addExercise() {
    const newExerciseName = document.getElementById('new-exercise').value.trim();
    const muscleGroup = muscleGroupSelect.value;

    if (newExerciseName && muscleGroup) {
        const groupRef = doc(db, "muscleGroups", muscleGroup);
        getDoc(groupRef).then(docSnap => {
            if (docSnap.exists()) {
                const exercises = docSnap.data().exercises;
                if (!exercises.includes(newExerciseName)) {
                    exercises.push(newExerciseName);
                    setDoc(groupRef, { exercises }).then(() => {
                        console.log("Ejercicio añadido:", newExerciseName);
                        debugInfo.innerText = "Ejercicio añadido: " + newExerciseName;
                        updateExerciseOptions();
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
                console.log("El grupo muscular no existe:", muscleGroup);
                debugInfo.innerText = "El grupo muscular no existe: " + muscleGroup;
            }
        }).catch(error => {
            console.error("Error obteniendo grupo muscular:", error);
            debugInfo.innerText = "Error obteniendo grupo muscular: " + error;
        });
    } else {
        console.log("No se seleccionó grupo muscular o nombre de ejercicio.");
        debugInfo.innerText = "No se seleccionó grupo muscular o nombre de ejercicio.";
    }
}

function saveExercise() {
    const muscleGroup = muscleGroupSelect.value;
    const exercise = exerciseSelect.value;
    const weight = weightInput.value;
    const repetitions = repetitionsInput.value;
    const dateTime = exerciseDateInput.value ? new Date(exerciseDateInput.value).toISOString() : new Date().toISOString();

    if (muscleGroup && exercise && weight && repetitions && dateTime && currentUser) {
        addDoc(collection(db, "exerciseRecords"), {
            userId: currentUser.uid,
            muscleGroup,
            exercise,
            weight: Number(weight),
            repetitions: Number(repetitions),
            dateTime
        }).then(() => {
            console.log("Registro de ejercicio guardado:", { muscleGroup, exercise, weight, repetitions, dateTime });
            debugInfo.innerText = "Registro de ejercicio guardado: " + exercise;
            displayExerciseRecords();
            clearForm();
        }).catch(error => {
            console.error("Error guardando registro de ejercicio:", error);
            debugInfo.innerText = "Error guardando registro de ejercicio: " + error;
        });
    } else {
        console.log("Datos del formulario incompletos.");
        debugInfo.innerText = "Datos del formulario incompletos.";
    }
}

function displayExerciseRecords() {
    if (!currentUser) {
        return;
    }

    const recordsQuery = query(
        collection(db, "exerciseRecords"),
        where("userId", "==", currentUser.uid),
        orderBy("dateTime", "desc")
    );

    getDocs(recordsQuery).then(snapshot => {
        exerciseRecordsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const formattedDateTime = new Date(data.dateTime).toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            const listItem = document.createElement("li");
            listItem.innerHTML = `
                ${formattedDateTime} - ${data.muscleGroup}: ${data.exercise} (${data.weight} kg x ${data.repetitions} reps)
                <button onclick="deleteRecord('${docSnap.id}')">Eliminar</button>
            `;
            exerciseRecordsList.appendChild(listItem);
        });
    }).catch(error => {
        console.error("Error mostrando registros de ejercicios:", error);
        debugInfo.innerText = "Error mostrando registros de ejercicios: " + error;
    });
}

function deleteRecord(docId) {
    deleteDoc(doc(db, "exerciseRecords", docId)).then(() => {
        console.log("Registro de ejercicio eliminado:", docId);
        debugInfo.innerText = "Registro de ejercicio eliminado: " + docId;
        displayExerciseRecords();
    }).catch(error => {
        console.error("Error eliminando registro de ejercicio:", error);
        debugInfo.innerText = "Error eliminando registro de ejercicio: " + error;
    });
}

function clearForm() {
    weightInput.value = '';
    repetitionsInput.value = '';
    exerciseDateInput.value = '';
}

muscleGroupSelect.addEventListener('change', updateExerciseOptions);
saveExerciseButton.addEventListener('click', saveExercise);
addMuscleGroupButton.addEventListener('click', addMuscleGroup);
addExerciseButton.addEventListener('click', addExercise);

window.deleteRecord = deleteRecord;