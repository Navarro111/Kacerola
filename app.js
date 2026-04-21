import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ======================================================
   1) CONFIGURACIÓN DE FIREBASE
   ====================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyApFU69xB_tbScy1pVtKnZrol84dFSEoQk",
  authDomain: "kacerola-crud.firebaseapp.com",
  projectId: "kacerola-crud",
  storageBucket: "kacerola-crud.firebasestorage.app",
  messagingSenderId: "153091127469",
  appId: "1:153091127469:web:3fdcfafb19c1cb5ab92e24"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ======================================================
   2) DATA CONNECT — endpoint base
   ====================================================== */
const DC_BASE =
  "https://firebasedataconnect.googleapis.com/v1beta/projects/kacerola-crud/locations/us-east4/services/kacerola-crud-service/connectors/kacerola-connector";

async function dcQuery(operationName, variables = {}) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${DC_BASE}:executeQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ operationName, variables })
  });
  if (!res.ok) throw new Error(`Query error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

async function dcMutation(operationName, variables = {}) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${DC_BASE}:executeMutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ operationName, variables })
  });
  if (!res.ok) throw new Error(`Mutation error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

/* ======================================================
   3) PANTALLAS
   ====================================================== */
const loginScreen = document.getElementById("login-screen");
const appScreen   = document.getElementById("app-screen");

function mostrarLogin() {
  loginScreen.classList.remove("oculto");
  appScreen.classList.add("oculto");
}

function mostrarApp() {
  loginScreen.classList.add("oculto");
  appScreen.classList.remove("oculto");
}

/* ======================================================
   4) LOGIN
   ====================================================== */
const loginForm    = document.getElementById("loginForm");
const loginEmail   = document.getElementById("loginEmail");
const loginPass    = document.getElementById("loginPass");
const loginError   = document.getElementById("loginError");
const btnLogout    = document.getElementById("btnLogout");
const userEmailTag = document.getElementById("userEmail");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPass.value);
  } catch (err) {
    loginError.textContent = "Credenciales incorrectas. Intenta de nuevo.";
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

/* ======================================================
   5) REFERENCIAS DEL DOM (app)
   ====================================================== */
const gastoForm      = document.getElementById("gastoForm");
const selectSucursal = document.getElementById("sucursal");
const selectCategoria= document.getElementById("categoria");
const selectPeriod   = document.getElementById("periodicidad");
const fecha          = document.getElementById("fecha");
const dia            = document.getElementById("dia");
const cantidad       = document.getElementById("cantidad");
const rubros         = document.getElementById("rubros");
const otros          = document.getElementById("otros");
const btnGuardar     = document.getElementById("btnGuardar");
const btnCancelar    = document.getElementById("btnCancelar");
const filtroCategoria= document.getElementById("filtroCategoria");
const filtroSucursal = document.getElementById("filtroSucursal");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const tablaGastos    = document.getElementById("tablaGastos");
const mensaje        = document.getElementById("mensaje");
const totalGastos    = document.getElementById("totalGastos");
const cantidadRegistros = document.getElementById("cantidadRegistros");

/* ======================================================
   6) ESTADO
   ====================================================== */
let gastos      = [];
let branches    = [];
let categories  = [];
let periodicities = [];
let editandoId  = null;

/* ======================================================
   7) FUNCIONES AUXILIARES
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
  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  return dias[new Date(`${fechaTexto}T00:00:00`).getDay()];
}

function escaparHTML(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function aplicarFiltros(lista) {
  let r = [...lista];
  if (filtroCategoria.value !== "Todas")
    r = r.filter(i => i.category?.name === filtroCategoria.value);
  if (filtroSucursal.value !== "Todas")
    r = r.filter(i => i.branch?.name === filtroSucursal.value);
  return r;
}

function actualizarResumen(lista) {
  const total = lista.reduce((a, i) => a + Number(i.cantidad || 0), 0);
  totalGastos.textContent = `B/. ${total.toFixed(2)}`;
  cantidadRegistros.textContent = lista.length;
}

function renderizarTabla() {
  const lista = aplicarFiltros(gastos);
  actualizarResumen(lista);

  if (lista.length === 0) {
    tablaGastos.innerHTML = `<tr><td colspan="9" class="empty">No hay registros para mostrar.</td></tr>`;
    return;
  }

  tablaGastos.innerHTML = lista.map(item => `
    <tr>
      <td>${escaparHTML(item.branch?.name)}</td>
      <td><span class="badge">${escaparHTML(item.category?.name)}</span></td>
      <td>${escaparHTML(item.periodicity?.name)}</td>
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
  `).join("");
}

/* ======================================================
   8) POBLAR SELECTS con datos de la BD
   ====================================================== */
async function poblarSelects() {
  try {
    const [bData, cData, pData] = await Promise.all([
      dcQuery("ListAllBranches"),
      dcQuery("ListAllCategories"),
      dcQuery("ListAllPeriodicities")
    ]);

    branches     = bData.branches     || [];
    categories   = cData.categories   || [];
    periodicities= pData.periodicities|| [];

    // Sucursal
    selectSucursal.innerHTML = `<option value="">Seleccione</option>` +
      branches.map(b => `<option value="${b.id}">${escaparHTML(b.name)}</option>`).join("");

    // Categoría
    selectCategoria.innerHTML = `<option value="">Seleccione</option>` +
      categories.map(c => `<option value="${c.id}">${escaparHTML(c.name)}</option>`).join("");

    // Periodicidad
    selectPeriod.innerHTML = `<option value="">Seleccione</option>` +
      periodicities.map(p => `<option value="${p.id}">${escaparHTML(p.name)}</option>`).join("");

    // Filtros
    filtroSucursal.innerHTML = `<option value="Todas">Todas</option>` +
      branches.map(b => `<option value="${b.name}">${escaparHTML(b.name)}</option>`).join("");

    filtroCategoria.innerHTML = `<option value="Todas">Todas</option>` +
      categories.map(c => `<option value="${c.name}">${escaparHTML(c.name)}</option>`).join("");

  } catch (err) {
    mostrarMensaje(`Error al cargar catálogos: ${err.message}`, "error");
  }
}

/* ======================================================
   9) CARGAR GASTOS
   ====================================================== */
async function cargarGastos() {
  try {
    const data = await dcQuery("ListAllGastos");
    gastos = data.gastos || [];
    renderizarTabla();
  } catch (err) {
    mostrarMensaje(`Error al cargar gastos: ${err.message}`, "error");
  }
}

/* ======================================================
   10) EVENTOS
   ====================================================== */
fecha.addEventListener("change", () => {
  dia.value = obtenerDiaEnEspanol(fecha.value);
});

gastoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const branchId     = selectSucursal.value;
  const categoryId   = selectCategoria.value;
  const periodicityId= selectPeriod.value;
  const fechaVal     = fecha.value;
  const diaVal       = dia.value;
  const cantidadVal  = parseFloat(cantidad.value);
  const rubrosVal    = rubros.value.trim();
  const otrosVal     = otros.value.trim();

  if (!branchId || !categoryId || !periodicityId || !fechaVal || !diaVal || isNaN(cantidadVal) || cantidadVal <= 0) {
    mostrarMensaje("Todos los campos son obligatorios.", "error");
    return;
  }

  try {
    if (editandoId) {
      await dcMutation("UpdateGasto", {
        id: editandoId,
        fecha: fechaVal, dia: diaVal,
        cantidad: cantidadVal,
        rubros: rubrosVal, otros: otrosVal,
        branchId, categoryId, periodicityId
      });
      mostrarMensaje("Gasto actualizado correctamente.", "success");
    } else {
      await dcMutation("CreateNewGasto", {
        fecha: fechaVal, dia: diaVal,
        cantidad: cantidadVal,
        rubros: rubrosVal, otros: otrosVal,
        branchId, categoryId, periodicityId
      });
      mostrarMensaje("Gasto guardado correctamente.", "success");
    }
    limpiarFormulario();
    await cargarGastos();
  } catch (err) {
    mostrarMensaje(`Error: ${err.message}`, "error");
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
  filtroSucursal.value  = "Todas";
  renderizarTabla();
  mostrarMensaje("Filtros limpiados.", "success");
});

tablaGastos.addEventListener("click", async (e) => {
  const btnEditar   = e.target.closest(".btn-editar");
  const btnEliminar = e.target.closest(".btn-eliminar");

  if (btnEditar) {
    const gasto = gastos.find(g => g.id === btnEditar.dataset.id);
    if (gasto) {
      selectSucursal.value  = gasto.branch?.id  || "";
      selectCategoria.value = gasto.category?.id|| "";
      selectPeriod.value    = gasto.periodicity?.id || "";
      fecha.value    = gasto.fecha;
      dia.value      = gasto.dia;
      cantidad.value = Number(gasto.cantidad).toFixed(2);
      rubros.value   = gasto.rubros || "";
      otros.value    = gasto.otros  || "";
      editandoId     = gasto.id;
      btnGuardar.textContent = "Actualizar gasto";
      btnCancelar.classList.remove("oculto");
      document.getElementById("formulario-section").scrollIntoView({ behavior: "smooth" });
    }
  }

  if (btnEliminar) {
    if (!confirm("¿Seguro que deseas eliminar este gasto?")) return;
    try {
      await dcMutation("DeleteGasto", { id: btnEliminar.dataset.id });
      mostrarMensaje("Gasto eliminado correctamente.", "success");
      if (editandoId === btnEliminar.dataset.id) limpiarFormulario();
      await cargarGastos();
    } catch (err) {
      mostrarMensaje(`Error al eliminar: ${err.message}`, "error");
    }
  }
});

/* ======================================================
   11) AUTH STATE — controla qué pantalla mostrar
   ====================================================== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userEmailTag.textContent = user.email;
    mostrarApp();
    await poblarSelects();
    await cargarGastos();
  } else {
    mostrarLogin();
    gastos = [];
  }
});
