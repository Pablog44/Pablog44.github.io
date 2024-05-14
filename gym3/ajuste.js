import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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
const deleteMuscleGroupButton = document.getElementById('delete-muscle-group');
const deleteExerciseButton = document.getElementById('delete-exercise');
const debugInfo = document.getElementById('debug-info');

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
    const userMuscleGroupsRef = collection(db, "userMuscleGroups");

    Promise.all([getDocs(muscleGroupsRef), getDocs(userMuscleGroupsRef)]).then(([muscleGroupsSnapshot, userMuscleGroupsSnapshot]) => {
        muscleGroupSelect.innerHTML = ''; // Limpiar las opciones existentes

        muscleGroupsSnapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id;
            option.value = doc.id;
            muscleGroupSelect.appendChild(option);
        });

        userMuscleGroupsSnapshot.forEach(doc => {
            if (doc.data().userId === currentUser.uid) {
                const option = document.createElement("option");
                option.textContent = doc.id.replace("Personalizado-", "");
                option.value = `${doc.id} (Personalizado)`;
                muscleGroupSelect.appendChild(option);
            }
        });

        updateExerciseOptions();
    }).catch(error => {
        console.error("Error cargando grupos musculares:", error);
        debugInfo.innerText = "Error cargando grupos musculares: " + error;
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
                option.value = exercise.name; // Asumimos que cada ejercicio tiene una propiedad "name"
                option.textContent = exercise.name;
                exerciseSelect.appendChild(option);
            });

            // Deshabilitar el botón de eliminar grupo muscular si no es personalizado
            deleteMuscleGroupButton.disabled = !isCustomGroup;
        } else {
            console.log(`No se encontraron ejercicios para el grupo ${selectedGroup}`);
            debugInfo.innerText = "No se encontraron ejercicios para el grupo seleccionado.";
        }
    }).catch(error => {
        console.error("Error cargando ejercicios:", error);
        debugInfo.innerText = "Error cargando ejercicios: " + error;
    });
}

function deleteMuscleGroup() {
    const muscleGroup = muscleGroupSelect.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const isCustomGroup = muscleGroupSelect.value.includes(" (Personalizado)");
    const groupRef = doc(db, "userMuscleGroups", `Personalizado-${muscleGroup}`);

    if (isCustomGroup && confirm(`¿Estás seguro de que deseas eliminar el grupo muscular ${muscleGroup}?`)) {
        deleteDoc(groupRef).then(() => {
            console.log(`Grupo muscular ${muscleGroup} eliminado.`);
            debugInfo.innerText = `Grupo muscular ${muscleGroup} eliminado.`;
            initializeMuscleGroups();
        }).catch(error => {
            console.error(`Error eliminando el grupo muscular ${muscleGroup}:`, error);
            debugInfo.innerText = `Error eliminando el grupo muscular ${muscleGroup}: ${error}`;
        });
    }
}

function deleteExercise() {
    const exerciseName = exerciseSelect.value;
    const muscleGroup = muscleGroupSelect.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const isCustomGroup = muscleGroupSelect.value.includes(" (Personalizado)");
    const groupRef = isCustomGroup ? doc(db, "userMuscleGroups", `Personalizado-${muscleGroup}`) : doc(db, "muscleGroups", muscleGroup);

    getDoc(groupRef).then(docSnap => {
        if (docSnap.exists()) {
            const exercises = docSnap.data().exercises;
            const exercise = exercises.find(ex => ex.name === exerciseName);

            if (exercise.isCustom) { // Verificar si el ejercicio es personalizado
                const updatedExercises = exercises.filter(ex => ex.name !== exerciseName);

                updateDoc(groupRef, { exercises: updatedExercises }).then(() => {
                    console.log(`Ejercicio ${exerciseName} eliminado del grupo muscular ${muscleGroup}.`);
                    debugInfo.innerText = `Ejercicio ${exerciseName} eliminado del grupo muscular ${muscleGroup}.`;
                    updateExerciseOptions();
                }).catch(error => {
                    console.error(`Error eliminando el ejercicio ${exerciseName} del grupo muscular ${muscleGroup}:`, error);
                    debugInfo.innerText = `Error eliminando el ejercicio ${exerciseName} del grupo muscular ${muscleGroup}: ${error}`;
                });
            } else {
                console.log(`El ejercicio ${exerciseName} no es personalizado y no puede ser eliminado.`);
                debugInfo.innerText = `El ejercicio ${exerciseName} no es personalizado y no puede ser eliminado.`;
            }
        }
    }).catch(error => {
        console.error(`Error obteniendo el grupo muscular ${muscleGroup}:`, error);
        debugInfo.innerText = `Error obteniendo el grupo muscular ${muscleGroup}: ${error}`;
    });
}

muscleGroupSelect.addEventListener('change', updateExerciseOptions);
deleteMuscleGroupButton.addEventListener('click', deleteMuscleGroup);
deleteExerciseButton.addEventListener('click', deleteExercise);
