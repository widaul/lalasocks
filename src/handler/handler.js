const db = require('../config/db');  // mysql2/promise pool

// Ambil semua produk
const getProduct = async (request, h) => {
  try {
    const [rows] = await db.query('SELECT id_product, name, description, price, image FROM products');
    return h.response(rows);
  } catch (err) {
    console.error('Error getProduct:', err);
    return h.response({ error: 'Gagal menampilkan produk' }).code(500);
  }
};

// Tambah ke keranjang
const addKeranjang = async (request, h) => {
  const { id, id_product, quantity } = request.payload;

  if (!id || !id_product || typeof quantity !== 'number' || quantity <= 0) {
    return h.response({ message: "Data tidak lengkap atau tidak valid" }).code(400);
  }

  try {
    const [existing] = await db.execute(
      'SELECT * FROM keranjang WHERE id = ? AND id_product = ?', [id, id_product]
    );

    if (existing.length > 0) {
      await db.execute(
        'UPDATE keranjang SET quantity = quantity + ? WHERE id = ? AND id_product = ?',
        [quantity, id, id_product]
      );
    } else {
      await db.execute(
        'INSERT INTO keranjang (id, id_product, quantity) VALUES (?, ?, ?)',
        [id, id_product, quantity]
      );
    }

    return h.response({ message: "Berhasil menambahkan ke keranjang" });
  } catch (error) {
    console.error('Error addKeranjang:', error);
    return h.response({ message: "Gagal menambahkan ke keranjang" }).code(500);
  }
};

// Tampilkan isi keranjang
const nampilinKeranjang = async (request, h) => {
  const id = request.query.id;

  if (!id) {
    return h.response({ message: "User ID dibutuhkan" }).code(400);
  }

  try {
    const [rows] = await db.execute(
      `SELECT k.quantity, p.id_product, p.name, p.description, p.price, p.image
       FROM keranjang k
       JOIN products p ON k.id_product = p.id_product
       WHERE k.id = ?`, [id]
    );

    return h.response(rows);
  } catch (error) {
    console.error('Error nampilinKeranjang:', error);
    return h.response({ message: "Gagal mengambil data keranjang" }).code(500);
  }
};

module.exports = { getProduct, addKeranjang, nampilinKeranjang };
