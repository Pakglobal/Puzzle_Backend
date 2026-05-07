import api from './api';

/**
 * GET /scene/game/all
 * Fetches all scenes for the game
 */
export const getAllScenes = async () => {
    const response = await api.get('/scenes/game/all');
    return response.data;
};

/**
 * GET /scene/:sceneId
 * Fetches a single scene by ID for editing
 */
export const getSceneById = async (sceneId) => {
    const response = await api.get(`/scenes/${sceneId}`);
    return response.data;
};

/**
 * POST /scene/:collectionId
 * Create a new scene with images
 * @param {string} collectionId
 * @param {FormData} formData
 */
export const createScene = async (collectionId, formData) => {
    const response = await api.post(`/scenes/${collectionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * PATCH /scene/:sceneId
 * Update an existing scene
 * @param {string} sceneId
 * @param {FormData} formData
 */
export const updateScene = async (sceneId, formData) => {
    const response = await api.patch(`/scenes/${sceneId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};
/**
 * DELETE /scenes/:sceneId
 * Delete a scene and its R2 assets
 * @param {string} sceneId
 */
export const deleteScene = async (sceneId) => {
    const response = await api.delete(`/scenes/${sceneId}`);
    return response.data;
};
