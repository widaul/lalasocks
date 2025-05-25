const mysql = require('mysql2/promise');


const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lalasocks',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection()
  .then(conn => {
    console.log('Database udah connect');
    conn.release();
  })
  .catch(err => {
    console.error('Database gagal connect:', err.message);
  });

module.exports = db;