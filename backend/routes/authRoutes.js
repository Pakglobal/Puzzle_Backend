'use strict';

const express = require('express');
const router = express.Router();

const {
    signup,
    login
} = require('../controllers/auth-controller');

router.post('/signup/:role', signup);
router.post('/login', login);


module.exports = router;
