const {getAllProductHandler} = require ('../handler/handler');

const routes = [
    {
        method: 'GET',
        path: '/allProduct',
        handler: getAllProductHandler,
    }
];

module.exports = routes;