import api from './api';

/**
 * GET /collections
 * Fetches all collections
 */
export const getAllCollections = async () => {
    const response = await api.get('/collections');
    return response.data;
};

/**
 * POST /collections
 * Create a new collection with a cover image
 * @param {FormData} formData
 */
export const createCollection = async (formData) => {
    const response = await api.post('/collections', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * GET /collections/:id/details
 * Fetches single collection details
 */
export const getCollection = async (id) => {
    const response = await api.get(`/collections/${id}/details`);
    return response.data;
};

/**
 * PUT /collections/:id
 * Update an existing collection
 * @param {string} id
 * @param {FormData} formData
 */
export const updateCollection = async (id, formData) => {
    const response = await api.put(`/collections/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * DELETE /collections/:id
 * Deletes a collection and its associated scenes
 * @param {string} id
 */
export const deleteCollection = async (id) => {
    const response = await api.delete(`/collections/${id}`);
    return response.data;
};
