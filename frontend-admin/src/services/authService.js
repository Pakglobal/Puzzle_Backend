import api from './api';

/**
 * POST /auth/signup/:role
 * @param {Object} data - { userName, firstname, lastname, email, password, confirmPassword }
 * @param {string} role - 'admin' or 'user'
 */
export const signup = async (data, role = 'admin') => {
    const response = await api.post(`/auth/signup/${role}`, data);
    return response.data;
};

/**
 * POST /auth/login
 * @param {Object} data - { email, password, role }
 */
export const login = async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
};
