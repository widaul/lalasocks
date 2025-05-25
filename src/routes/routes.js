const {getProduct, addKeranjang, nampilinKeranjang} = require ('../handler/handler');

const routes = [
    {
        method: 'GET',
        path: '/allProduct',
        handler: getProduct,
    },
    {
        method: 'POST',
        path: '/keranjang',
        handler: addKeranjang,
    },
    {
        method: 'GET',
        path: '/keranjang',
        handler: nampilinKeranjang,
    }
];

module.exports = routes;