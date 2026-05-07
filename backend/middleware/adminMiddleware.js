'use strict';

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges are required.'
        });
    }

    next();
};

module.exports = adminMiddleware;
