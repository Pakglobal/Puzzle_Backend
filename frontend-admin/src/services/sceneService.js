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
