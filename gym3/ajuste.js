import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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

    Promise.all([getDocs(muscleGroupsRef), getDocs(query(userMuscleGroupsRef, where("userId", "==", currentUser.uid)))]).then(([muscleGroupsSnapshot, userMuscleGroupsSnapshot]) => {
        muscleGroupSelect.innerHTML = ''; // Limpiar las opciones existentes

        muscleGroupsSnapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id;
            option.value = doc.id;
            muscleGroupSelect.appendChild(option);
        });

        userMuscleGroupsSnapshot.forEach(doc => {
            const option = document.createElement("option");
            option.textContent = doc.id.replace("Personalizado-", "") + " (Personalizado)";
            option.value = `${doc.id} (Personalizado)`;
            muscleGroupSelect.appendChild(option);
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
    const userExercisesRef = collection(db, "userExercises");
    const userExercisesQuery = query(userExercisesRef, where("userId", "==", currentUser.uid), where("muscleGroup", "==", selectedGroup));

    exerciseSelect.innerHTML = ''; // Limpiar las opciones anteriores

    // Agregar ejercicios personalizados del usuario
    getDocs(userExercisesQuery).then(snapshot => {
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const exercise = doc.data().exercise;
                const option = document.createElement("option");
                option.value = exercise;
                option.textContent = exercise;
                exerciseSelect.appendChild(option);
            });
        } else {
            console.log(`No se encontraron ejercicios personalizados para el grupo ${selectedGroup}`);
            debugInfo.innerText = "No se encontraron ejercicios personalizados para el grupo seleccionado.";
        }
    }).catch(error => {
        console.error("Error cargando ejercicios personalizados:", error);
        debugInfo.innerText = "Error cargando ejercicios personalizados: " + error;
    });

    // Deshabilitar el botón de eliminar grupo muscular si no es personalizado
    deleteMuscleGroupButton.disabled = !isCustomGroup;
}

function deleteMuscleGroup() {
    const muscleGroup = muscleGroupSelect.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const groupRef = doc(db, "userMuscleGroups", `Personalizado-${muscleGroup}`);

    if (confirm(`¿Estás seguro de que deseas eliminar el grupo muscular ${muscleGroup}?`)) {
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
    const exercise = exerciseSelect.value;
    const muscleGroup = muscleGroupSelect.value.replace(" (Personalizado)", "").replace("Personalizado-", "");
    const userExercisesRef = collection(db, "userExercises");
    const userExerciseQuery = query(userExercisesRef, where("userId", "==", currentUser.uid), where("muscleGroup", "==", muscleGroup), where("exercise", "==", exercise));

    if (confirm(`¿Estás seguro de que deseas eliminar el ejercicio ${exercise} del grupo muscular ${muscleGroup}?`)) {
        getDocs(userExerciseQuery).then(snapshot => {
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    deleteDoc(doc.ref).then(() => {
                        console.log(`Ejercicio ${exercise} eliminado del grupo muscular ${muscleGroup}.`);
                        debugInfo.innerText = `Ejercicio ${exercise} eliminado del grupo muscular ${muscleGroup}.`;
                        updateExerciseOptions();
                    }).catch(error => {
                        console.error(`Error eliminando el ejercicio ${exercise} del grupo muscular ${muscleGroup}:`, error);
                        debugInfo.innerText = `Error eliminando el ejercicio ${exercise} del grupo muscular ${muscleGroup}: ${error}`;
                    });
                });
            } else {
                console.log(`No se encontró el ejercicio ${exercise} en el grupo muscular ${muscleGroup}.`);
                debugInfo.innerText = `No se encontró el ejercicio ${exercise} en el grupo muscular ${muscleGroup}.`;
            }
        }).catch(error => {
            console.error(`Error obteniendo el ejercicio ${exercise} del grupo muscular ${muscleGroup}:`, error);
            debugInfo.innerText = `Error obteniendo el ejercicio ${exercise} del grupo muscular ${muscleGroup}: ${error}`;
        });
    }
}

muscleGroupSelect.addEventListener('change', updateExerciseOptions);
deleteMuscleGroupButton.addEventListener('click', deleteMuscleGroup);
deleteExerciseButton.addEventListener('click', deleteExercise);
