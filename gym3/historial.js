import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
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

const exerciseRecordsList = document.getElementById('exercise-records');
const debugInfo = document.getElementById('debug-info');

let currentUser;

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'inicio.html';
    } else {
        currentUser = user;
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

function displayExerciseRecords() {
    if (!currentUser) return;

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
                <button onclick="confirmDeleteRecord('${docSnap.id}', '${data.muscleGroup}', '${data.exercise}')">Eliminar</button>
            `;
            exerciseRecordsList.appendChild(listItem);
        });
    }).catch(error => {
        console.error("Error mostrando registros de ejercicios:", error);
        debugInfo.innerText = "Error mostrando registros de ejercicios: " + error;
    });
}

function confirmDeleteRecord(docId, muscleGroup, exercise) {
    const confirmation = confirm(`¿Estás seguro que deseas eliminar el ejercicio "${exercise}" del grupo muscular "${muscleGroup}"?`);
    if (confirmation) {
        deleteRecord(docId);
    }
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

window.confirmDeleteRecord = confirmDeleteRecord;