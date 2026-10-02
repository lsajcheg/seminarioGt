// ===============================
// CONFIGURACIÓN GENERAL
// ===============================
const API_URL = "http://localhost:3000/api";
let socket = null;

// Inicializar socket solo si existe la librería
if (typeof io !== "undefined") {
  socket = io("http://localhost:3000");
}

// ===============================
// TOKEN
// ===============================
function getToken() {
  return localStorage.getItem("token");
}

// ===============================
// LOGOUT
// ===============================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ===============================
// LOGIN
// ===============================
async function login() {
  const correo = document.getElementById("loginCorreo").value;
  const password = document.getElementById("loginPassword").value;
  const msgEl = document.getElementById("loginMsg");

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    window.location.href = "index.html";  // REDIRECCIÓN AUTOMÁTICA
  } else {
    msgEl.textContent = data.msg || "Error en login";
    msgEl.style.color = "red";
  }
}

// ===============================
// REGISTRO
// ===============================
async function registrar() {
  const nombre = document.getElementById("regNombre").value;
  const apellido = document.getElementById("regApellido").value;
  const correo = document.getElementById("regCorreo").value;
  const telefono = document.getElementById("regTelefono").value;
  const password = document.getElementById("regPassword").value;

  const msgEl = document.getElementById("regMsg");

  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, apellido, correo, telefono, password })
  });

  const data = await res.json();

  if (res.ok) {
    msgEl.textContent = "Registro exitoso. Ya puedes iniciar sesión.";
    msgEl.style.color = "green";
  } else {
    msgEl.textContent = data.msg || "Error al registrar";
    msgEl.style.color = "red";
  }
}

// ===============================
// INVENTARIO (HOME)
// ===============================
async function buscarVehiculos() {
  const marca = document.getElementById("filtroMarca")?.value || "";
  const modelo = document.getElementById("filtroModelo")?.value || "";
  const dano = document.getElementById("filtroDano")?.value || "";

  const params = new URLSearchParams();
  if (marca) params.append("marca", marca);
  if (modelo) params.append("modelo", modelo);
  if (dano) params.append("dano", dano);

  const res = await fetch(`${API_URL}/vehiculos?${params.toString()}`);
  const data = await res.json();

  const grid = document.getElementById("gridVehiculos");
  if (!grid) return;

  grid.innerHTML = "";

  data.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    const danoClass =
      v.dano === "Verde" ? "verde" :
      v.dano === "Amarillo" ? "amarillo" : "rojo";

    card.innerHTML = `
      <img src="http://localhost:3000/uploads/${v.id}-1.jpg" onerror="this.src='https://via.placeholder.com/400x220?text=Foto+no+disponible'">

      <div class="card-content">
        <span class="badge-dano ${danoClass}">${v.dano}</span>
        <h3>${v.marca} ${v.modelo} (${v.anio})</h3>
        <p>Motor: ${v.motor}</p>
        <p>Transmisión: ${v.transmision}</p>
        <p><strong>Precio base:</strong> Q. ${v.precio_base}</p>

        <button class="btn btn-primary" onclick="verDetalle(${v.id})">
          Ver detalle
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function verDetalle(id) {
  window.location.href = `detalle.html?id=${id}`;
}

// ===============================
// PUBLICAR VEHÍCULO
// ===============================
async function publicarVehiculo() {
  const token = getToken();
  const msgEl = document.getElementById("pubMsg");

  if (!token) {
    msgEl.textContent = "Debes iniciar sesión para publicar.";
    msgEl.style.color = "red";
    return;
  }

  const formData = new FormData();
  formData.append("anio", document.getElementById("pubAnio").value);
  formData.append("tipo_articulo", document.getElementById("pubTipo").value);
  formData.append("marca", document.getElementById("pubMarca").value);
  formData.append("modelo", document.getElementById("pubModelo").value);
  formData.append("motor", document.getElementById("pubMotor").value);
  formData.append("transmision", document.getElementById("pubTransmision").value);
  formData.append("combustible", document.getElementById("pubCombustible").value);
  formData.append("tren_manejo", document.getElementById("pubTren").value);
  formData.append("cilindros", document.getElementById("pubCilindros").value);
  formData.append("dano", document.getElementById("pubDano").value);
  formData.append("precio_base", document.getElementById("pubPrecio").value);
  formData.append("fecha_inicio", document.getElementById("pubInicio").value);
  formData.append("fecha_fin", document.getElementById("pubFin").value);

  const fotos = document.getElementById("pubFotos").files;
  if (fotos.length < 5) {
    msgEl.textContent = "Debes subir mínimo 5 fotos.";
    msgEl.style.color = "red";
    return;
  }

  for (const foto of fotos) {
    formData.append("fotos", foto);
  }

  const res = await fetch(`${API_URL}/vehiculos`, {
    method: "POST",
    headers: { Authorization: token },
    body: formData
  });

  const data = await res.json();

  if (res.ok) {
    msgEl.textContent = "Vehículo publicado correctamente.";
    msgEl.style.color = "green";
  } else {
    msgEl.textContent = data.msg || "Error al publicar";
    msgEl.style.color = "red";
  }
}

// ===============================
// DETALLE DEL VEHÍCULO
// ===============================
async function cargarDetalle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const res = await fetch(`${API_URL}/vehiculos/${id}`);
  const data = await res.json();

  const cont = document.getElementById("detalleContainer");
  const v = data.vehiculo;
  const fotos = data.fotos;
  const pujaActual = data.puja_actual;

  cont.innerHTML = `
    <h2>${v.marca} ${v.modelo} (${v.anio})</h2>

    <div class="detalle-fotos">
      ${fotos.map(f => `
        <img src="http://localhost:3000${f.url}">
      `).join("")}
    </div>

    <p><strong>Motor:</strong> ${v.motor}</p>
    <p><strong>Transmisión:</strong> ${v.transmision}</p>
    <p><strong>Combustible:</strong> ${v.combustible}</p>
    <p><strong>Tren de manejo:</strong> ${v.tren_manejo}</p>
    <p><strong>Cilindros:</strong> ${v.cilindros}</p>
    <p><strong>Daño:</strong> ${v.dano}</p>

    <div class="subasta-panel">
      <h3>Subasta en tiempo real</h3>

      <p><strong>Precio base:</strong> Q. ${v.precio_base}</p>
      <p><strong>Oferta actual:</strong> <span id="ofertaActual">${pujaActual || "Sin ofertas"}</span></p>

      <span id="estadoBadge" class="badge-estado">Estado: pendiente</span>

      <div class="form-group" style="margin-top:1rem;">
        <label>Mi oferta (Q.)</label>
        <input id="montoPuja" type="number">
      </div>

      <button class="btn btn-primary" onclick="enviarPuja(${v.id})">Pujar</button>

      <p id="pujaMsg"></p>
    </div>
  `;

  // Socket para tiempo real
  if (socket) {
    socket.on("nuevaPuja", dataPuja => {
      if (dataPuja.vehiculo_id == id) {
        document.getElementById("ofertaActual").textContent = dataPuja.monto;

        const badge = document.getElementById("estadoBadge");
        badge.textContent = "Tu oferta fue superada";
        badge.className = "badge-estado superado";
      }
    });
  }
}

// ===============================
// ENVIAR PUJA
// ===============================
async function enviarPuja(vehiculoId) {
  const monto = Number(document.getElementById("montoPuja").value);
  const msgEl = document.getElementById("pujaMsg");
  const token = getToken();

  if (!token) {
    msgEl.textContent = "Debes iniciar sesión para pujar.";
    msgEl.style.color = "red";
    return;
  }

  const res = await fetch(`${API_URL}/pujas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ vehiculo_id: vehiculoId, monto })
  });

  const data = await res.json();

  if (res.ok) {
    msgEl.textContent = "Puja registrada.";
    msgEl.style.color = "green";

    document.getElementById("ofertaActual").textContent = data.puja.monto;

    const badge = document.getElementById("estadoBadge");
    badge.textContent = "¡Vas ganando!";
    badge.className = "badge-estado ganando";

    if (socket) {
      socket.emit("pujar", { vehiculo_id: vehiculoId, monto: data.puja.monto });
    }
  } else {
    msgEl.textContent = data.msg || "Error al pujar";
    msgEl.style.color = "red";
  }
}

// ===============================
// AUTO-INIT SEGÚN LA PÁGINA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.endsWith("index.html") || path.endsWith("/")) {
    buscarVehiculos();
  }

  if (path.endsWith("detalle.html")) {
    cargarDetalle();
  }
});

