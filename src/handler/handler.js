const db = require('../config/db'); // mysql2/promise pool
const crypto = require('crypto');
const midtransClient = require('midtrans-client');
const User = require('../data/user');
const { hashPassword, comparePassword } = require('../middlewares/hashPassword');
const verifyToken = require('../middlewares/verifyToken');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { nanoid } = require('nanoid');
const { addUser, findUserByEmail } = require('../data/user');
const { v4: uuidv4 } = require('uuid');


//validasi input user 
const userSchema = Joi.object({
  username: Joi.string().min(5).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  telephone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
})

//registrasi user baru
const register = async (req, h) => {
  const { username, email, password, telephone } = req.payload;

  const { error } = userSchema.validate({ username, email, password, telephone });
  if (error) {
    return h.response({
      status: 'fail',
      message: error.details[0].message,
    }).code(400);
  }

  try {
    const existingUser = await User.findUserByEmail(email);
    if (existingUser) {
      return h.response({
        status: 'fail',
        message: 'Email sudah terdaftar.',
      }).code(400);
    }

    const hashedPassword = await hashPassword(password);
    const id = nanoid(16);

    await User.addUser({ id, username, email, password: hashedPassword, telephone, role: 'user' });


    return h.response({
      status: 'success',
      message: 'User berhasil didaftarkan.',
      data: { userId: id },
    }).code(201);
  } catch (err) {
    console.error('Error in registration:', err.message);
    return h.response({
      status: 'error',
      message: 'Terjadi kesalahan pada server.',
    }).code(500);
  }
};



//login
const loginUser = async (req, h) => {
  const { email, password } = req.payload;

  try {
    const user = await User.findUserByEmail(email);

    if (!user || user.role !== 'user') {
      return h.response({
        status: 'fail',
        message: 'Email atau password salah',
      }).code(400);
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return h.response({
        status: 'fail',
        message: 'Email atau password salah',
      }).code(400);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    return h.response({
      status: 'success',
      message: 'Login berhasil',
      token,
      role: user.role
    }).code(200);
  } catch (err) {
    console.error('Login error:', err.message);
    return h.response({
      status: 'error',
      message: 'Terjadi kesalahan pada server.',
    }).code(500);
  }
};

const loginAdmin = async (req, h) => {
  const { email, password } = req.payload;

  try {
    const user = await User.findUserByEmail(email);

    if (!user || user.role !== 'admin') {
      return h.response({
        status: 'fail',
        message: 'Email atau password salah atau bukan admin',
      }).code(400);
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return h.response({
        status: 'fail',
        message: 'Email atau password salah',
      }).code(400);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    return h.response({
      status: 'success',
      message: 'Login admin berhasil',
      token,
      role: user.role
    }).code(200);
  } catch (err) {
    console.error('Login admin error:', err.message);
    return h.response({
      status: 'error',
      message: 'Terjadi kesalahan pada server.',
    }).code(500);
  }
};


const getProfile = async (request, h) => {
  try {
    const { id } = request.auth.credentials; // ambil id dari JWT
    const user = await User.findUserById(id);

    if (!user) {
      return h.response({
        status: 'fail',
        message: 'User tidak ditemukan',
      }).code(404);
    }

    return h.response({
      status: 'success',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error getProfile:', err);
    return h.response({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil profil',
    }).code(500);
  }
};


// Ambil semua produk
const getProduct = async (request, h) => {
  try {
    const [rows] = await db.query(
      'SELECT id_product, name, description, price, image FROM products'
    );
    return h.response(rows);
  } catch (err) {
    console.error('Error getProduct:', err);
    return h.response({ error: 'Gagal menampilkan produk' }).code(500);
  }
};

// Tambah ke keranjang
const addKeranjang = async (request, h) => {
  const id = request.auth.credentials.id;
  const { id_product, quantity } = request.payload;

  if (!id_product || typeof quantity !== 'number' || quantity <= 0) {
    return h.response({ message: 'Data tidak lengkap atau tidak valid' }).code(400);
  }

  try {
    const [existing] = await db.execute(
      'SELECT * FROM keranjang WHERE id = ? AND id_product = ?',
      [id, id_product]
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

    return h.response({
      message: existing.length > 0
        ? 'Jumlah produk ditambahkan ke keranjang'
        : 'Produk baru ditambahkan ke keranjang'
    }).code(201);

  } catch (error) {
    console.error('Error addKeranjang:', error);
    return h.response({ message: 'Gagal menambahkan ke keranjang' }).code(500);
  }
};


// Tampilkan isi keranjang
const nampilinKeranjang = async (request, h) => {
  const id = request.auth.credentials.id;

  if (!id) {
    return h.response({ message: 'User ID dibutuhkan' }).code(400);
  }

  try {
    const [rows] = await db.execute(
      `SELECT k.id_keranjang, k.quantity, p.id_product, p.name, p.description, p.price, p.image
       FROM keranjang k
       JOIN products p ON k.id_product = p.id_product
       WHERE k.id = ?`,
      [id]
    );

    return h.response(rows);
  } catch (error) {
    console.error('Error nampilinKeranjang:', error);
    return h.response({ message: 'Gagal mengambil data keranjang' }).code(500);
  }
};

// Update jumlah produk di keranjang
const updateKeranjang = async (request, h) => {
  const id = request.auth.credentials.id;
  const { id_product, action } = request.payload;

  if (!id_product || !['tambah', 'kurang'].includes(action)) {
    return h.response({ message: 'Data tidak lengkap atau tidak valid' }).code(400);
  }

  try {
    const [rows] = await db.execute(
      'SELECT quantity FROM keranjang WHERE id = ? AND id_product = ?',
      [id, id_product]
    );

    if (rows.length === 0) {
      return h.response({ message: 'Produk tidak ditemukan' }).code(400);
    }

    let currentQty = rows[0].quantity;

    if (action === 'tambah') currentQty += 1;
    if (action === 'kurang') currentQty -= 1;

    if (currentQty <= 0) {
      await db.execute(
        'DELETE FROM keranjang WHERE id = ? AND id_product = ?',
        [id, id_product]
      );
    } else {
      await db.execute(
        'UPDATE keranjang SET quantity = ? WHERE id = ? AND id_product = ?',
        [currentQty, id, id_product]
      );
    }

    return h.response({ message: 'Jumlah produk berhasil diupdate' });
  } catch (err) {
    console.error('Error updateKeranjang:', err);
    return h.response({ message: 'Gagal update keranjang' }).code(500);
  }
};

/* Checkout keranjang (Midtrans)
const checkoutCart = async (request, h) => {
  const { id_keranjang } = request.payload;

  if (!Array.isArray(id_keranjang) || id_keranjang.length === 0) {
    return h.response({ message: 'id_keranjang harus berupa array dan tidak boleh kosong' }).code(400);
  }

  const connection = await db.getConnection();

  try {
    const placeholders = id_keranjang.map(() => '?').join(', ');
    const [cartRows] = await connection.execute(
      `SELECT * FROM keranjang WHERE id_keranjang IN (${placeholders})`,
      id_keranjang
    );

    if (cartRows.length === 0) {
      return h.response({ message: 'Keranjang tidak ditemukan' }).code(404);
    }

    const userId = cartRows[0].id;
    const [userRows] = await connection.execute(
      `SELECT id, name, email, telephone FROM user WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return h.response({ message: 'User tidak ditemukan' }).code(404);
    }

    const user = userRows[0];
    const productsInCart = [];
    let totalPrice = 0;

    for (const cartItem of cartRows) {
      const [productRows] = await connection.execute(
        `SELECT id_product, name, price FROM products WHERE id_product = ?`,
        [cartItem.id_product]
      );

      if (productRows.length === 0) {
        return h.response({ message: 'Produk tidak ditemukan di cart' }).code(404);
      }

      const product = productRows[0];
      productsInCart.push({
        id: product.id_product,
        price: product.price,
        quantity: cartItem.quantity,
        name: product.name,
      });
      totalPrice += product.price * cartItem.quantity;
    }

    const orderId = `ORDER-${Date.now()}`;
    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
    });

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: totalPrice,
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
        phone: user.telephone,
      },
      item_details: productsInCart,
    });

    await connection.beginTransaction();

    await connection.execute(
      'INSERT INTO payments (order_id, user_id, total_price, token, redirect_url) VALUES (?, ?, ?, ?, ?)',
      [orderId, user.id, totalPrice, transaction.token, transaction.redirect_url]
    );

    await connection.execute(
      `DELETE FROM keranjang WHERE id_keranjang IN (${placeholders})`,
      id_keranjang
    );

    await connection.commit();

    return h.response({
      message: 'Berhasil checkout, lanjutkan pembayaran!',
      redirect_url: transaction.redirect_url,
    }).code(201);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error checkoutCart:', error);
    return h.response({ message: 'Gagal checkout cart' }).code(500);
  } finally {
    if (connection) connection.release();
  }
};

// Callback dari Midtrans
const paymentCallback = async (request, h) => {
  const {
    order_id, status_code, gross_amount, signature_key,
    transaction_status, fraud_status,
    settlement_time, transaction_time, payment_type,
  } = request.payload;

  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const hash = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (hash !== signature_key) {
      return h.response({ message: 'Signature Key tidak valid' }).code(403);
    }

    const [paymentRows] = await db.execute(
      `SELECT * FROM payments WHERE order_id = ?`,
      [order_id]
    );

    if (paymentRows.length === 0) {
      return h.response({ message: 'Pembayaran tidak ditemukan' }).code(404);
    }

    let statusUpdate = '';
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      statusUpdate = 'paid';
    } else if (transaction_status === 'settlement') {
      statusUpdate = 'paid';
    } else if (transaction_status === 'expire') {
      statusUpdate = 'expire';
    } else {
      return h.response({ message: 'Status tidak diproses lebih lanjut' });
    }

    await db.execute(
      `UPDATE payments SET status = ?, settlement_time = ?, payment_type = ? WHERE order_id = ?`,
      [statusUpdate, settlement_time || transaction_time, payment_type, order_id]
    );

    return h.response({ message: 'Status pembayaran berhasil diperbarui' });
  } catch (error) {
    console.error('Error paymentCallback:', error);
    return h.response({ message: 'Gagal memproses callback' }).code(500);
  }
};
*/

const checkoutManual = async (request, h) => {
  const user_id = request.auth.credentials.id;
  const { nama, alamat, total, items } = request.payload;

  if (
    !user_id ||
    typeof nama !== 'string' || !nama.trim() ||
    typeof alamat !== 'string' || !alamat.trim() ||
    typeof total !== 'number' || total <= 0 ||
    !Array.isArray(items) || items.length === 0
  ) {
    return h.response({ message: 'Data tidak lengkap atau tidak valid' }).code(400);
  }

  for (const item of items) {
    if (
      !item.id_product || typeof item.id_product !== 'string' ||
      !item.name || typeof item.name !== 'string' ||
      typeof item.price !== 'number' || item.price <= 0 ||
      typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)
    ) {
      return h.response({ message: 'Data item tidak valid' }).code(400);
    }
  }

  const connection = await db.getConnection();
  const orderId = `ORDER-MANUAL-${uuidv4()}`;

  console.log('Generated orderId:', orderId);

  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO orders (order_id, id_user, nama, alamat, total, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [orderId, user_id, nama.trim(), alamat.trim(), total]
    );

    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, id_product, name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.id_product, item.name, item.price, item.quantity]
      );
    }

    if (items.length > 0) {
      const productIds = items.map(i => i.id_product);
      const placeholders = productIds.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM keranjang WHERE id = ? AND id_product IN (${placeholders})`,
        [user_id, ...productIds]
      );
    }

    await connection.commit();

    return h.response({ message: 'Pesanan berhasil disimpan', order_id: orderId }).code(201);
  } catch (error) {
    await connection.rollback();
    console.error('Error checkoutManual:', error);
    return h.response({ message: 'Gagal menyimpan pesanan manual' }).code(500);
  } finally {
    connection.release();
  }
};


const getUserOrders = async (request, h) => {
  const userId = request.auth.credentials.id;
  console.log('getUserOrders - userId:', userId);

  if (!userId) {
    return h.response({ message: 'User tidak terautentikasi' }).code(401);
  }

  try {
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id_user = ? ORDER BY created_at DESC',
      [userId]
    );
    console.log('Orders:', orders);

    const detailedOrders = [];

    for (const order of orders) {
      const [items] = await db.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.order_id]
      );
      console.log('Order items for', order.order_id, items);
      detailedOrders.push({ ...order, items });
    }

    return h.response(detailedOrders).code(200);
  } catch (error) {
    console.error('Error getUserOrders:', error);
    return h.response({ message: 'Gagal mengambil pesanan' }).code(500);
  }
};





const getPesananAdmin = async (request, h) => {
  try {
    const [orders] = await db.execute(
      `SELECT * FROM orders ORDER BY created_at DESC`
    );

    const pesananLengkap = await Promise.all(orders.map(async (order) => {
      const [items] = await db.execute(
        `SELECT id_product, name, price, quantity FROM order_items WHERE order_id = ?`,
        [order.order_id]
      );
      return {
        ...order,
        items
      };
    }));

    return h.response(pesananLengkap);
  } catch (error) {
    console.error('Error getPesananAdmin:', error);
    return h.response({ message: 'Gagal mengambil semua pesanan' }).code(500);
  }
};

const ubahStatusPesanan = async (request, h) => {
  const { order_id } = request.params;
  const { status } = request.payload;

  const allowedStatus = ['pending', 'diproses', 'dikirim', 'selesai', 'dibatalkan'];
  if (!allowedStatus.includes(status)) {
    return h.response({ message: 'Status tidak valid' }).code(400);
  }

  try {
    const [result] = await db.execute(
      `UPDATE orders SET status = ? WHERE order_id = ?`,
      [status, order_id]
    );

    if (result.affectedRows === 0) {
      return h.response({ message: 'Pesanan tidak ditemukan' }).code(404);
    }

    return h.response({ message: 'Status pesanan berhasil diperbarui' });
  } catch (error) {
    console.error('Error ubahStatusPesanan:', error);
    return h.response({ message: 'Gagal mengubah status pesanan' }).code(500);
  }
};



module.exports = {
  register,
  loginUser,
  loginAdmin,
  getProfile,
  getProduct,
  addKeranjang,
  nampilinKeranjang,
  updateKeranjang,
  //checkoutCart,
  //paymentCallback,
  checkoutManual,
  getUserOrders,
  getPesananAdmin,
  ubahStatusPesanan
};
