// backend/api.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const pool = require("./db");

const router = express.Router();

// ------------------ SUBIDA DE FOTOS ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads")); // solo usa la carpeta, no la crea
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});



const upload = multer({ storage });

// ------------------ AUTH MIDDLEWARE ------------------
function auth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ msg: "No autorizado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ msg: "Token inválido" });
  }
}

// ------------------ REGISTRO ------------------
router.post("/register", async (req, res) => {
  const { nombre, apellido, correo, telefono, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, apellido, correo, telefono, password_hash)
       VALUES ($1,$2,$3,$4,$5)`,
      [nombre, apellido, correo, telefono, hash]
    );

    res.json({ msg: "Usuario registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al registrar" });
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  const { correo, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ msg: "Credenciales inválidas" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) return res.status(400).json({ msg: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user.id, correo: user.correo },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ msg: "Login correcto", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error en login" });
  }
});

// ------------------ PUBLICAR VEHÍCULO ------------------
router.post("/vehiculos", auth, upload.array("fotos", 10), async (req, res) => {
  const {
    anio, tipo_articulo, marca, modelo, motor,
    transmision, combustible, tren_manejo,
    cilindros, dano, precio_base, fecha_inicio, fecha_fin
  } = req.body;

  if (!req.files || req.files.length < 5)
    return res.status(400).json({ msg: "Debes subir mínimo 5 fotos" });

  try {
    await pool.query("BEGIN");

    const vehiculo = await pool.query(
      `INSERT INTO vehiculos
      (usuario_id, anio, tipo_articulo, marca, modelo, motor, transmision,
       combustible, tren_manejo, cilindros, dano, precio_base, fecha_inicio, fecha_fin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        req.user.id, anio, tipo_articulo, marca, modelo, motor, transmision,
        combustible, tren_manejo, cilindros, dano, precio_base, fecha_inicio, fecha_fin
      ]
    );

    const vehiculoId = vehiculo.rows[0].id;

    for (const f of req.files) {
      await pool.query(
        "INSERT INTO fotos_vehiculo (vehiculo_id, url) VALUES ($1,$2)",
        [vehiculoId, "/uploads/" + f.filename]
      );
    }

    await pool.query("COMMIT");
    res.json({ msg: "Vehículo publicado", id: vehiculoId });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ msg: "Error al publicar" });
  }
});

// ------------------ LISTAR VEHÍCULOS ------------------
router.get("/vehiculos", async (req, res) => {
  const { marca, modelo, dano } = req.query;

  let query = "SELECT * FROM vehiculos WHERE 1=1";
  const params = [];
  let idx = 1;

  if (marca) { query += ` AND marca = $${idx++}`; params.push(marca); }
  if (modelo) { query += ` AND modelo = $${idx++}`; params.push(modelo); }
  if (dano) { query += ` AND dano = $${idx++}`; params.push(dano); }

  const result = await pool.query(query, params);
  res.json(result.rows);
});

// ------------------ DETALLE ------------------
router.get("/vehiculos/:id", async (req, res) => {
  const id = req.params.id;

  const vehiculo = await pool.query("SELECT * FROM vehiculos WHERE id = $1", [id]);
  const fotos = await pool.query("SELECT * FROM fotos_vehiculo WHERE vehiculo_id = $1", [id]);
  const puja = await pool.query("SELECT monto_max FROM vista_puja_max WHERE vehiculo_id = $1", [id]);

  res.json({
    vehiculo: vehiculo.rows[0],
    fotos: fotos.rows,
    puja_actual: puja.rows[0]?.monto_max || null
  });
});

// ------------------ PUJAR ------------------
router.post("/pujas", auth, async (req, res) => {
  const { vehiculo_id, monto } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO pujas (vehiculo_id, usuario_id, monto) VALUES ($1,$2,$3) RETURNING *",
      [vehiculo_id, req.user.id, monto]
    );

    res.json({ msg: "Puja registrada", puja: result.rows[0] });

  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
