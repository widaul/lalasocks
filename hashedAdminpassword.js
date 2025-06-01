const bcrypt = require('bcrypt');

(async () => {
  const password = 'dummy_password'; // ganti dengan password admin yang kamu pakai
  const hashed = await bcrypt.hash(password, 10);
  console.log('Hashed Password:', hashed);
})();
