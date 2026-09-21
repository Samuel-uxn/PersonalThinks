import {
  auth, signInWithEmailAndPassword, onAuthStateChanged,
  identificadorACorreo, mensajeError
} from "./firebase.js";

const $ = (id) => document.getElementById(id);

// Si ya hay una sesión iniciada, entra directo a la app
onAuthStateChanged(auth, (usuario) => {
  if (usuario) window.location.href = "principal.html";
});

async function iniciarSesion() {
  const correo = identificadorACorreo($("inIdentificador").value);
  const contrasena = $("inContrasena").value;

  if (!correo || !contrasena) {
    $("mensaje").textContent = "Escribe tu correo o celular y tu contraseña.";
    return;
  }

  $("btnEntrar").disabled = true;
  $("mensaje").textContent = "Ingresando...";
  try {
    await signInWithEmailAndPassword(auth, correo, contrasena);
    // onAuthStateChanged te redirige a principal.html
  } catch (error) {
    $("mensaje").textContent = mensajeError(error);
    $("btnEntrar").disabled = false;
  }
}

$("btnEntrar").onclick = iniciarSesion;
$("inContrasena").addEventListener("keydown", (e) => {
  if (e.key === "Enter") iniciarSesion();
});
$("btnCrearCuenta").onclick = () => { window.location.href = "registro.html"; };