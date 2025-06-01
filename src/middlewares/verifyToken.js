const jwt = require('jsonwebtoken');

const verifyToken = (request, h) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return h.response({
      status: 'gagal',
      message: 'Token tidak ditemukan atau tidak valid',
    }).code(401).takeover();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    // Tambahkan ini:
    request.auth = {
      credentials: decoded,
    };

    return h.continue;
  } catch (err) {
    return h.response({
      status: 'gagal',
      message: 'Token tidak valid atau kadaluarsa',
    }).code(401).takeover();
  }
};

const verifyAdmin = (request, h) => {
  const { role } = request.auth.credentials;
  if (role !== 'admin') {
    return h.response({
      status: 'fail',
      message: 'Akses hanya untuk admin.',
    }).code(403).takeover();
  }
  return h.continue;
};


module.exports = { verifyToken, verifyAdmin };
