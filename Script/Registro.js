import {
  auth, createUserWithEmailAndPassword, updateProfile,
  identificadorACorreo, mensajeError
} from "./firebase.js";

const $ = (id) => document.getElementById(id);

async function registrar() {
  const nombre = $("inNombre").value.trim();
  const apellido = $("inApellido").value.trim();
  const correo = identificadorACorreo($("inCelular").value);
  const contrasena = $("inContraseña").value;

  if (!nombre || !apellido) {
    $("mensaje").textContent = "Escribe tu nombre y tu apellido.";
    return;
  }
  if (!correo) {
    $("mensaje").textContent = "Escribe un correo válido o un número de celular (solo números).";
    return;
  }
  if (contrasena.length < 6) {
    $("mensaje").textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  $("btnRegistro").disabled = true;
  $("mensaje").textContent = "Creando tu cuenta...";
  try {
    const credencial = await createUserWithEmailAndPassword(auth, correo, contrasena);
    // Guardamos el nombre en el perfil para mostrarlo en la app
    await updateProfile(credencial.user, { displayName: nombre + " " + apellido });
    window.location.href = "principal.html";
  } catch (error) {
    $("mensaje").textContent = mensajeError(error);
    $("btnRegistro").disabled = false;
  }
}

$("btnRegistro").onclick = registrar;
$("inContraseña").addEventListener("keydown", (e) => {
  if (e.key === "Enter") registrar();
});