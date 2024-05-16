import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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
const debugInfo = document.getElementById('debug-info');

let currentUser;

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
        initializeMuscleGroups();
        initializeUserMuscleGroups();
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

function initializeUserMuscleGroups() {
    const userMuscleGroupsRef = collection(db, "userMuscleGroups");
    const userMuscleGroupsQuery = query(userMuscleGroupsRef, where("userId", "==", currentUser.uid));
    getDocs(userMuscleGroupsQuery).then(snapshot => {
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id.replace("Personalizado-", "");
            option.value = `${doc.id} (Personalizado)`;
            muscleGroupSelect.appendChild(option);
        });
        updateExerciseOptions();
    }).catch(error => {
        console.error("Error cargando grupos musculares personalizados:", error);
        debugInfo.innerText = "Error cargando grupos musculares personalizados: " + error;
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
    const selectedGroup = muscleGroupSelect.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const isCustomGroup = muscleGroupSelect.value.includes(" (Personalizado)");
    const groupRef = isCustomGroup ? doc(db, "userMuscleGroups", `Personalizado-${selectedGroup}`) : doc(db, "muscleGroups", selectedGroup);

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

function saveExercise() {
    const muscleGroup = muscleGroupSelect.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const isCustomGroup = muscleGroupSelect.value.includes(" (Personalizado)");
    const exercise = exerciseSelect.value;
    const weight = weightInput.value;
    const repetitions = repetitionsInput.value;
    const dateTime = exerciseDateInput.value ? new Date(exerciseDateInput.value).toISOString() : new Date().toISOString();

    if (muscleGroup && exercise && weight && repetitions && dateTime && currentUser) {
        addDoc(collection(db, "exerciseRecords"), {
            userId: currentUser.uid,
            muscleGroup: isCustomGroup ? `Personalizado-${muscleGroup}` : muscleGroup,
            exercise,
            weight: Number(weight),
            repetitions: Number(repetitions),
            dateTime
        }).then(() => {
            console.log("Registro de ejercicio guardado:", { muscleGroup, exercise, weight, repetitions, dateTime });
            debugInfo.innerText = "Registro de ejercicio guardado: " + exercise;
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

function clearForm() {
    weightInput.value = '';
    repetitionsInput.value = '';
    exerciseDateInput.value = '';
}

muscleGroupSelect.addEventListener('change', updateExerciseOptions);
saveExerciseButton.addEventListener('click', saveExercise);
