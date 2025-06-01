const { options } = require('joi');
const {
    register,
    loginUser,
    loginAdmin,
    getProduct,
    addKeranjang,
    nampilinKeranjang,
    updateKeranjang,
    checkoutCart,
    paymentCallback,
    checkoutManual,
    getUserOrders,
    getPesananAdmin,
    ubahStatusPesanan,
    getProfile
} = require('../handler/handler');
const { verifyToken, verifyAdmin } = require('../middlewares/verifyToken');

const routes = [
    {
        method: 'POST',
        path: '/register',
        handler: register,
    },
    {
        method: 'POST',
        path: '/user/login',
        handler: loginUser,
    },
    {
        method: 'POST',
        path: '/admin/login',
        handler: loginAdmin,
    },
    {
        method: 'GET',
        path: '/profile',
        options: {
            pre: [{ method: verifyToken }],
        },
        handler: getProfile,
    },
    {
        method: 'GET',
        path: '/allProduct',
        handler: getProduct,
    },
    {
        method: 'POST',
        path: '/keranjang',
        options: {
            pre: [{ method: verifyToken }],
        },
        handler: addKeranjang,
    },
    {
        method: 'GET',
        path: '/keranjang',
        options: {
            pre: [{ method: verifyToken }],
        },
        handler: nampilinKeranjang,
    },
    {
        method: 'POST',
        path: '/keranjang/update',
        options: {
            pre: [{ method: verifyToken }],
        },
        handler: updateKeranjang,
    },
    /*
    {
        method: 'POST',
        path: '/payments',
        handler: checkoutCart,
    },
    {
        method: 'POST',
        path: '/payments/payment-callback',
        handler: paymentCallback,
    },
    */
    {
        method: 'POST',
        path: '/pesanan/manual',
        options: {
            pre: [{ method: verifyToken }],
        },
        handler: checkoutManual,
    },
    {
        method: 'GET',
        path: '/pesanan',
        options: {
            pre: [{ method: verifyToken }],
        },
        handler: getUserOrders,
    },
    {
        method: 'GET',
        path: '/admin/pesanan',
        options: {
            pre: [
                { method: verifyToken },
                { method: verifyAdmin },],
        },
        handler: getPesananAdmin,

    },
    {
        method: 'PUT',
        path: '/admin/pesanan/{order_id}',
        options: {
            pre: [
                { method: verifyToken },
                { method: verifyAdmin },
            ],
        },
        handler: ubahStatusPesanan,
    }
];

module.exports = routes;
