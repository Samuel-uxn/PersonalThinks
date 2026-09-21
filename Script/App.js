import {
  auth, db, onAuthStateChanged, signOut,
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc
} from "./firebase.js";

/* =====================================================================
   1) ALMACENAMIENTO (Firestore, ligado al usuario que inició sesión)
   Ruta: usuarios/{uid}/tareas, usuarios/{uid}/notas, usuarios/{uid}/config/horario
   ===================================================================== */
const col = (nombre) => collection(db, "usuarios", auth.currentUser.uid, nombre);
const docHorario = () => doc(db, "usuarios", auth.currentUser.uid, "config", "horario");

const almacen = {
  async listar(nombre) {
    const snap = await getDocs(col(nombre));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async agregar(nombre, datos) { await addDoc(col(nombre), datos); },
  async actualizar(nombre, id, datos) {
    await updateDoc(doc(db, "usuarios", auth.currentUser.uid, nombre, id), datos);
  },
  async borrar(nombre, id) {
    await deleteDoc(doc(db, "usuarios", auth.currentUser.uid, nombre, id));
  },
  async obtenerHorario() {
    const snap = await getDoc(docHorario());
    return snap.exists() ? snap.data().imagen : null;
  },
  async guardarHorario(dataUrl) { await setDoc(docHorario(), { imagen: dataUrl }); },
  async borrarHorario() { await setDoc(docHorario(), { imagen: null }); }
};

/* =====================================================================
   3) UTILIDADES
   ===================================================================== */
const $ = (id) => document.getElementById(id);

// Convierte "2026-09-25" en una fecha local (sin problemas de zona horaria)
function fechaLocal(texto) {
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a, m - 1, d);
}

function diasHasta(textoFecha) {
  const hoy = new Date();
  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fechaLocal(textoFecha) - hoy0) / 86400000);
}

const DIAS_PARA_AVISAR = 3; // "próxima a vencer" = faltan 3 días o menos

function estadoTarea(t) {
  if (t.completada) return "Completada";
  const dias = diasHasta(t.fecha);
  if (dias < 0) return "VENCIDA (hace " + Math.abs(dias) + (Math.abs(dias) === 1 ? " día)" : " días)");
  if (dias === 0) return "PRÓXIMA A VENCER: vence HOY";
  if (dias <= DIAS_PARA_AVISAR) return "PRÓXIMA A VENCER (en " + dias + (dias === 1 ? " día)" : " días)");
  return "Pendiente (en " + dias + " días)";
}

function crear(etiqueta, texto) {
  const el = document.createElement(etiqueta);
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Reduce la imagen para que quepa en un documento de Firestore (límite ~1 MB)
function comprimirImagen(archivo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      let ancho = Math.min(img.width, 1400);
      let calidad = 0.75;
      let resultado;
      do {
        const escala = ancho / img.width;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resultado = canvas.toDataURL("image/jpeg", calidad);
        ancho = Math.round(ancho * 0.85);
        calidad = Math.max(0.4, calidad - 0.05);
      } while (resultado.length > 900000 && ancho > 300);
      URL.revokeObjectURL(url);
      resolve(resultado);
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = url;
  });
}

/* =====================================================================
   4) TAREAS
   ===================================================================== */
async function mostrarTareas() {
  const lista = $("lista-tareas");
  lista.innerHTML = "";
  const tareas = await almacen.listar("tareas");

  if (tareas.length === 0) {
    lista.appendChild(crear("li", "Aún no tienes tareas. Agrega la primera arriba."));
    return;
  }

  // Pendientes primero (por fecha), completadas al final
  tareas.sort((a, b) => (a.completada - b.completada) || a.fecha.localeCompare(b.fecha));

  for (const t of tareas) {
    const li = crear("li");
    li.appendChild(crear("strong", t.titulo));
    li.appendChild(crear("br"));
    if (t.nota) { li.appendChild(crear("span", t.nota)); li.appendChild(crear("br")); }
    li.appendChild(crear("span", "Entrega: " + fechaLocal(t.fecha).toLocaleDateString("es-CO", { dateStyle: "long" })));
    li.appendChild(crear("br"));
    li.appendChild(crear("span", "Estado: " + estadoTarea(t)));
    li.appendChild(crear("br"));

    const btnEstado = crear("button", t.completada ? "Marcar como pendiente" : "Marcar como completada");
    btnEstado.type = "button";
    btnEstado.onclick = async () => {
      await almacen.actualizar("tareas", t.id, { completada: !t.completada });
      mostrarTareas();
    };

    const btnBorrar = crear("button", "Eliminar");
    btnBorrar.type = "button";
    btnBorrar.onclick = async () => {
      if (!confirm("¿Eliminar esta tarea?")) return;
      await almacen.borrar("tareas", t.id);
      mostrarTareas();
    };

    li.appendChild(btnEstado);
    li.appendChild(btnBorrar);
    li.appendChild(crear("br"));
    li.appendChild(crear("br"));
    lista.appendChild(li);
  }
}

$("btn-agregar-tarea").onclick = async () => {
  const titulo = $("tarea-titulo").value.trim();
  const nota = $("tarea-nota").value.trim();
  const fecha = $("tarea-fecha").value;

  if (!titulo || !fecha) {
    alert("Escribe el nombre de la actividad y la fecha de entrega.");
    return;
  }
  await almacen.agregar("tareas", { titulo, nota, fecha, completada: false });
  $("tarea-titulo").value = "";
  $("tarea-nota").value = "";
  $("tarea-fecha").value = "";
  mostrarTareas();
};

/* =====================================================================
   5) NOTAS (agrupadas por fecha, la más reciente primero)
   ===================================================================== */
async function mostrarNotas() {
  const contenedor = $("lista-notas");
  contenedor.innerHTML = "";
  const notas = await almacen.listar("notas");

  if (notas.length === 0) {
    contenedor.appendChild(crear("p", "Aún no tienes notas. Escribe la primera arriba."));
    return;
  }

  notas.sort((a, b) => b.creada.localeCompare(a.creada));

  let diaActual = "";
  for (const n of notas) {
    const fecha = new Date(n.creada);
    const dia = fecha.toLocaleDateString("es-CO", { dateStyle: "full" });

    if (dia !== diaActual) {
      diaActual = dia;
      contenedor.appendChild(crear("h4", dia));
    }

    const bloque = crear("div");
    bloque.appendChild(crear("strong", n.titulo || "(sin título)"));
    bloque.appendChild(crear("span", " — " + fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })));
    const texto = crear("p", n.texto);
    texto.style.whiteSpace = "pre-wrap"; // respeta los saltos de línea
    bloque.appendChild(texto);

    const btnBorrar = crear("button", "Eliminar");
    btnBorrar.type = "button";
    btnBorrar.onclick = async () => {
      if (!confirm("¿Eliminar esta nota?")) return;
      await almacen.borrar("notas", n.id);
      mostrarNotas();
    };
    bloque.appendChild(btnBorrar);
    bloque.appendChild(crear("hr"));
    contenedor.appendChild(bloque);
  }
}

$("btn-agregar-nota").onclick = async () => {
  const titulo = $("nota-titulo").value.trim();
  const texto = $("nota-texto").value.trim();

  if (!texto) {
    alert("Escribe el contenido de la nota.");
    return;
  }
  await almacen.agregar("notas", { titulo, texto, creada: new Date().toISOString() });
  $("nota-titulo").value = "";
  $("nota-texto").value = "";
  mostrarNotas();
};

/* =====================================================================
   6) HORARIO
   ===================================================================== */
async function mostrarHorario() {
  const dataUrl = await almacen.obtenerHorario();
  const img = $("horario-imagen");
  if (dataUrl) {
    img.src = dataUrl;
    img.hidden = false;
    $("btn-borrar-horario").hidden = false;
    $("horario-mensaje").textContent = "";
  } else {
    img.hidden = true;
    $("btn-borrar-horario").hidden = true;
    $("horario-mensaje").textContent = "Aún no has subido tu horario.";
  }
}

$("horario-archivo").onchange = async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  try {
    $("horario-mensaje").textContent = "Guardando...";
    const dataUrl = await comprimirImagen(archivo);
    await almacen.guardarHorario(dataUrl);
    await mostrarHorario();
  } catch (err) {
    $("horario-mensaje").textContent = "Error: " + err.message;
  }
  e.target.value = "";
};

$("btn-borrar-horario").onclick = async () => {
  if (!confirm("¿Borrar la imagen del horario?")) return;
  await almacen.borrarHorario();
  mostrarHorario();
};

/* =====================================================================
   7) MENÚ (mostrar una sección a la vez)
   ===================================================================== */
function irA(nombre) {
  for (const id of ["tareas", "notas", "horario"]) {
    $(id).hidden = (id !== nombre);
  }
}
document.querySelectorAll("nav button").forEach(b => {
  b.onclick = () => irA(b.dataset.seccion);
});

/* =====================================================================
   8) SESIÓN E INICIO
   Si no hay sesión iniciada, te manda a la pantalla de inicio de sesión.
   ===================================================================== */
onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.href = "inicioSesion.html";
    return;
  }
  $("estado-sesion").textContent = "Hola, " + (usuario.displayName || "estudiante");
  mostrarTareas();
  mostrarNotas();
  mostrarHorario();
});

$("btn-logout").onclick = async () => {
  await signOut(auth); // al cerrar sesión, onAuthStateChanged te redirige al inicio
};