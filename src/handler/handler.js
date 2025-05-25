const getAllProduct = require('../app/product')
const db = require('../config/db')

const getProduct = async (request, h) => {
    try {
        const [rows] = await db.query('SELECT * FROM products');
        return h.response(rows);
    }
    catch (err) {
        return h.response({ error: 'Gagal nampilin produk' }).code(500);
    }
};

const addKeranjang = async (request, h) => {
    const { id, id_product, quantity } = request.payload;

    if (!id || !id_product || !quantity) {
        return h.response({ message: "Data tdk lengkap" }).code(400);
    }

    const connection = await mysql.createConnection(db);

    const [existing] = await connection.execute(
        'SELECT * FROM keranjang WHERE id=? AND id_product=?', [id, id_product]
    );

    if (existing.length > 0) {
        await connection.execute(
            'UPDATE keranjang SET quantity = quantity + ? WHERE id=? AND id_product=?', [quantity, id, id_product]
        );

    }
    else {
        await connection.execute(
            'INSERT INTO keranjang (id, id_product, quantity'
        );
    }

    await connection.end();
    return { message: "Berhasil menambahkan ke keranjang" };


}

const nampilinKeranjang = async (request, h) => {
    const id = request.query.id;
    
    if(!id) return h.response({message:"user id dibutuhkan"}).code(400);

    const connection = await mysql.createConnection(db);
    const [rows] = await connection.execute(
        `SELECT keranjang.quantity, product.id_product, product.name, product.description, product.price, product.image
        FROM keranjang k
        JOIN product p ON keranjang.id_product = p.id`
    )
    
    }

module.exports = { getProduct, addKeranjang };



