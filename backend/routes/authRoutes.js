'use strict';

const express = require('express');
const router = express.Router();

const {
    signup,
    login,
    updateFcmToken
} = require('../controllers/auth-controller');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup/:role', signup);
router.post('/login', login);
router.post('/update-fcm-token', authMiddleware, updateFcmToken);


module.exports = router;
