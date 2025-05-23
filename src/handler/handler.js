const getAllProduct = require ('../app/product')

const getAllProductHandler = (request, h) => {
    const data = getAllProduct();
    return h.response(data).code(200);
}

module.exports = {getAllProductHandler};

