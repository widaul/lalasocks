const db = require('../config/db');

const findUserByEmail = async (email) => {
  const sql = 'SELECT * FROM user WHERE email = ? LIMIT 1';
  const [results] = await db.query(sql, [email]);
  return results.length === 0 ? null : results[0];
};

const addUser = async (data) => {
  const sql = 'INSERT INTO user SET ?';
  const [results] = await db.query(sql, data);
  if (!results || results.affectedRows === 0) {
    throw new Error('Gagal menambahkan user.');
  }
  return results;
};

const findUserById = async (id) => {
  const sql = 'SELECT id, username, email, telephone, role FROM user WHERE id = ? LIMIT 1';
  const [results] = await db.query(sql, [id]);
  return results.length === 0 ? null : results[0];
};

module.exports = { findUserByEmail, addUser, findUserById };
