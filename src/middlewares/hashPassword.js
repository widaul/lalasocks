const bcrypt = require('bcrypt');

exports.hashPassword = async (password) => {
    const saltRound = 10;
    return await bcrypt.hash(password, saltRound);
};

exports.comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};