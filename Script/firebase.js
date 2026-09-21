import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =====================================================================
   PEGA AQUÍ LOS DATOS DE TU PROYECTO
   Firebase > Configuración del proyecto > Tus apps > Web
   ===================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBz49N_J3Jrb8JbbWepwDhljEgYIOpA1Bk",
  authDomain: "organizador-283bf.firebaseapp.com",
  projectId: "organizador-283bf",
  appId: "1:750418047549:web:95f5f218c7c9796aa9f054"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-exportamos lo que usan las demás páginas, así todo se importa desde un solo lugar
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =====================================================================
   UTILIDADES
   ===================================================================== */

// Firebase inicia sesión con correo + contraseña.
// Si la persona escribe un número de celular, lo convertimos a un "correo interno"
// (ej: 3001234567@celular.invalid) para poder usar el mismo sistema.
// Devuelve null si no es ni un correo ni un celular válido.
export function identificadorACorreo(texto) {
  const t = texto.trim().toLowerCase();
  if (t.includes("@")) return t;
  const digitos = t.replace(/[\s\-()+]/g, "");
  if (/^\d{7,15}$/.test(digitos)) return digitos + "@celular.invalid";
  return null;
}

export function mensajeError(error) {
  const mensajes = {
    "auth/invalid-credential": "Correo/celular o contraseña incorrectos.",
    "auth/user-not-found": "Correo/celular o contraseña incorrectos.",
    "auth/wrong-password": "Correo/celular o contraseña incorrectos.",
    "auth/invalid-email": "El correo o celular no es válido.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo o celular.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    "auth/network-request-failed": "No hay conexión. Revisa tu internet.",
    "auth/operation-not-allowed": "Activa 'Correo electrónico/contraseña' en Firebase > Authentication."
  };
  return mensajes[error.code] || "Ocurrió un error (" + error.code + ").";
}