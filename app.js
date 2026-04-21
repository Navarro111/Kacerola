import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ======================================================
   1) PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
   ====================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyApFU69xB_tbScy1pVtKnZrol84dFSEoQk",
  authDomain: "kacerola-crud.firebaseapp.com",
  projectId: "kacerola-crud",
  storageBucket: "kacerola-crud.firebasestorage.app",
  messagingSenderId: "153091127469",
  appId: "1:153091127469:web:3fdcfafb19c1cb5ab92e24"
};

/* ======================================================
   2) INICIALIZAR FIREBASE
   ====================================================== */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const gastosRef = collection(db, "gastos");

/* ======================================================
   3) REFERENCIAS DEL DOM
   ====================================================== */
const gastoForm = document.getElementById("gastoForm");
const sucursal = document.getElementById("sucursal");
const categoria = document.getElementById("categoria");
const periodicidad = document.getElementById("periodicidad");
const fecha = document.getElementById("fecha");
const dia = document.getElementById("dia");
const cantidad = document.getElementById("cantidad");
const rubros = document.getElementById("rubros");
const otros = document.getElementById("otros");

const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");

const filtroCategoria = document.getElementById("filtroCategoria");
const filtroSucursal = document.getElementById("filtroSucursal");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");

const tablaGastos = document.getElementById("tablaGastos");
const mensaje = document.getElementById("mensaje");
const totalGastos = document.getElementById("totalGastos");
const cantidadRegistros = document.getElementById("cantidadRegistros");

/* ======================================================
   4) ESTADO DE LA APP
   ====================================================== */
let gastos = [];
let editandoId = null;

/* ======================================================
   5) FUNCIONES AUXILIARES
   ====================================================== */
function mostrarMensaje(texto, tipo = "success") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;

  setTimeout(() => {
    mensaje.className = "mensaje oculto";
    mensaje.textContent = "";
  }, 3500);
}

function limpiarFormulario() {
  gastoForm.reset();
  dia.value = "";
  editandoId = null;
  btnGuardar.textContent = "Guardar gasto";
  btnCancelar.classList.add("oculto");
}

function obtenerDiaEnEspanol(fechaTexto) {
  if (!fechaTexto) return "";

  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
  ];

  const fechaObj = new Date(`${fechaTexto}T00:00:00`);
  return dias[fechaObj.getDay()];
}

function validarCampos() {
  if (
    !sucursal.value.trim() ||
    !categoria.value.trim() ||
    !periodicidad.value.trim() ||
    !fecha.value.trim() ||
    !dia.value.trim() ||
    !cantidad.value.trim() ||
    !rubros.value.trim() ||
    !otros.value.trim()
  ) {
    mostrarMensaje("Todos los campos son obligatorios. No pueden quedar vacíos.", "error");
    return false;
  }

  const monto = parseFloat(cantidad.value);
  if (isNaN(monto) || monto <= 0) {
    mostrarMensaje("La cantidad debe ser un número mayor que 0.", "error");
    return false;
  }

  return true;
}

function obtenerDatosFormulario() {
  return {
    sucursal: sucursal.value.trim(),
    categoria: categoria.value.trim(),
    periodicidad: periodicidad.value.trim(),
    fecha: fecha.value,
    dia: dia.value.trim(),
    cantidad: parseFloat(cantidad.value),
    rubros: rubros.value.trim(),
    otros: otros.value.trim(),
    updatedAt: serverTimestamp()
  };
}

function escaparHTML(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function aplicarFiltros(lista) {
  let resultado = [...lista];

  if (filtroCategoria.value !== "Todas") {
    resultado = resultado.filter(item => item.categoria === filtroCategoria.value);
  }

  if (filtroSucursal.value !== "Todas") {
    resultado = resultado.filter(item => item.sucursal === filtroSucursal.value);
  }

  return resultado;
}

function actualizarResumen(lista) {
  const total = lista.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  totalGastos.textContent = `B/. ${total.toFixed(2)}`;
  cantidadRegistros.textContent = lista.length;
}

function renderizarTabla() {
  const listaFiltrada = aplicarFiltros(gastos);
  actualizarResumen(listaFiltrada);

  if (listaFiltrada.length === 0) {
    tablaGastos.innerHTML = `
      <tr>
        <td colspan="9" class="empty">No hay registros para mostrar.</td>
      </tr>
    `;
    return;
  }

  tablaGastos.innerHTML = listaFiltrada
    .map(
      item => `
        <tr>
          <td>${escaparHTML(item.sucursal)}</td>
          <td><span class="badge">${escaparHTML(item.categoria)}</span></td>
          <td>${escaparHTML(item.periodicidad)}</td>
          <td>${escaparHTML(item.fecha)}</td>
          <td>${escaparHTML(item.dia)}</td>
          <td>B/. ${Number(item.cantidad).toFixed(2)}</td>
          <td>${escaparHTML(item.rubros)}</td>
          <td>${escaparHTML(item.otros)}</td>
          <td>
            <div class="actions">
              <button class="btn warning btn-editar" data-id="${item.id}">Editar</button>
              <button class="btn danger btn-eliminar" data-id="${item.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function cargarDatosEnFormulario(item) {
  sucursal.value = item.sucursal;
  categoria.value = item.categoria;
  periodicidad.value = item.periodicidad;
  fecha.value = item.fecha;
  dia.value = item.dia;
  cantidad.value = Number(item.cantidad).toFixed(2);
  rubros.value = item.rubros;
  otros.value = item.otros;

  editandoId = item.id;
  btnGuardar.textContent = "Actualizar gasto";
  btnCancelar.classList.remove("oculto");

  document.getElementById("formulario-section").scrollIntoView({ behavior: "smooth" });
}

/* ======================================================
   6) EVENTOS
   ====================================================== */
fecha.addEventListener("change", () => {
  dia.value = obtenerDiaEnEspanol(fecha.value);
});

gastoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validarCampos()) return;

  try {
    const datos = obtenerDatosFormulario();

    if (editandoId) {
      const docRef = doc(db, "gastos", editandoId);
      await updateDoc(docRef, datos);
      mostrarMensaje("Gasto actualizado correctamente.", "success");
    } else {
      await addDoc(gastosRef, {
        ...datos,
        createdAt: serverTimestamp()
      });
      mostrarMensaje("Gasto guardado correctamente.", "success");
    }

    limpiarFormulario();
  } catch (error) {
    console.error("Error al guardar/actualizar:", error);
    mostrarMensaje(`Error al procesar la operación: ${error.message}`, "error");
  }
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("Edición cancelada.", "warning");
});

filtroCategoria.addEventListener("change", renderizarTabla);
filtroSucursal.addEventListener("change", renderizarTabla);

btnLimpiarFiltros.addEventListener("click", (e) => {
  e.preventDefault();
  filtroCategoria.value = "Todas";
  filtroSucursal.value = "Todas";
  renderizarTabla();
  mostrarMensaje("Filtros limpiados.", "success");
});

tablaGastos.addEventListener("click", async (e) => {
  const botonEditar = e.target.closest(".btn-editar");
  const botonEliminar = e.target.closest(".btn-eliminar");

  if (botonEditar) {
    const id = botonEditar.dataset.id;
    const gasto = gastos.find(item => item.id === id);

    if (gasto) {
      cargarDatosEnFormulario(gasto);
    }
  }

  if (botonEliminar) {
    const id = botonEliminar.dataset.id;
    const confirmar = confirm("¿Seguro que deseas eliminar este gasto?");

    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "gastos", id));
      mostrarMensaje("Gasto eliminado correctamente.", "success");

      if (editandoId === id) {
        limpiarFormulario();
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      mostrarMensaje(`Error al eliminar: ${error.message}`, "error");
    }
  }
});

/* ======================================================
   7) LECTURA EN TIEMPO REAL
   ====================================================== */
function escucharGastosEnTiempoReal() {
  try {
    onSnapshot(
      gastosRef,
      (snapshot) => {
        gastos = snapshot.docs.map((docu) => ({
          id: docu.id,
          ...docu.data()
        }));

        gastos.sort((a, b) => b.fecha.localeCompare(a.fecha));
        renderizarTabla();
      },
      (error) => {
        console.error("Error en tiempo real:", error);
        mostrarMensaje(`Error al leer datos en tiempo real: ${error.message}`, "error");
      }
    );
  } catch (error) {
    console.error("Error general al escuchar datos:", error);
    mostrarMensaje(`Error al cargar datos: ${error.message}`, "error");
  }
}

/* ======================================================
   8) INICIO
   ====================================================== */
escucharGastosEnTiempoReal();
