const {getProduct} = require ('../handler/handler');

const routes = [
    {
        method: 'GET',
        path: '/allProduct',
        handler: getProduct,
    }
];

module.exports = routes;