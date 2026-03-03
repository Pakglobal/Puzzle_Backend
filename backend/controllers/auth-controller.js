'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

require('dotenv').config();

exports.signup = async (req, res) => {
    const { role } = req.params;
    const { userName, firstname, lastname, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: 'The passwords do not match. Please try again.'
        });
    }

    try {
        const normalizedRole = role === 'admin' ? 'admin' : 'user';
        const model = normalizedRole === 'admin' ? Admin : User;
        const existingUser = await model.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'This email is already associated with an existing account. Please use a different email or log in instead.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let newUser;
        if (normalizedRole === 'admin') {
            newUser = new Admin({ userName, email, password: hashedPassword, role: 'admin' });
        } else {
            newUser = new User({
                firstname,
                lastname,
                email,
                password: hashedPassword,
                role: 'user'
            });
        }

        await newUser.save();
        res.status(201).json({
            success: true,
            message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} registered successfully!`
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected server error occurred. Please try again later.'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const normalizedRole = role === 'admin' ? 'admin' : 'user';
        const model = normalizedRole === 'admin' ? Admin : User;

        const user = await model.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'The email provided is not registered. Please sign up first.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'The password entered is incorrect. Please try again.'
            });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role || normalizedRole },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successfully',
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected server error occurred. Please try again later.'
        });
    }
};

