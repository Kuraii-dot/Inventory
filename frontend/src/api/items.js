// frontend/src/api/items.js
// Replaces: all fetch() calls in front/js/items.js and inline PHP fetches

import client from './client.js';
import { cachedGet, invalidateApiCache } from './cache.js';

const inventoryPrefixes = ['/items', '/dashboard', '/allocations', '/distributions', '/inspection-requests'];
const referencePrefixes = ['/categories', '/suppliers', '/classifications'];
const invalidateInventory = () => invalidateApiCache(inventoryPrefixes);

export const fetchItems = (params, options = {}) => cachedGet('/items', { params, ttl: 15_000, ...options });
export const fetchAllOverview = (options = {}) => cachedGet('/items/all-overview', { ttl: 45_000, ...options });
export const fetchItemsByCategory = (category_id, options = {}) => cachedGet('/items/by-category', { params: { category_id }, ttl: 30_000, ...options });
export const fetchItemsByClassification = (classification_id, options = {}) => cachedGet('/items/by-classification', { params: { classification_id }, ttl: 30_000, ...options });
export const fetchItemById = (id, options = {}) => cachedGet(`/items/${id}`, { ttl: 15_000, ...options });
export const createItem = async (data) => { const response = await client.post('/items', data); invalidateInventory(); return response.data; };
export const updateItem = async (id, data) => { const response = await client.put(`/items/${id}`, data); invalidateInventory(); return response.data; };
export const deleteItem = async (id) => { const response = await client.delete(`/items/${id}`); invalidateInventory(); return response.data; };
export const validateStock = (item_id, quantity) => cachedGet('/items/validate-stock', { params: { item_id, quantity }, ttl: 5_000 });

// frontend/src/api/suppliers.js
export const fetchSuppliers = (options = {}) => cachedGet('/suppliers', { ttl: 300_000, ...options });
export const createSupplier = async (name) => { const response = await client.post('/suppliers', { name }); invalidateApiCache(referencePrefixes); return response.data; };
export const updateSupplier = async (id, name) => { const response = await client.put(`/suppliers/${id}`, { name }); invalidateApiCache([...referencePrefixes, ...inventoryPrefixes]); return response.data; };
export const deleteSupplier = async (id) => { const response = await client.delete(`/suppliers/${id}`); invalidateApiCache([...referencePrefixes, ...inventoryPrefixes]); return response.data; };

// frontend/src/api/categories.js
export const fetchCategories = (options = {}) => cachedGet('/categories', { ttl: 300_000, ...options });
export const createCategory = async (name) => { const response = await client.post('/categories', { name }); invalidateApiCache(referencePrefixes); return response.data; };
export const updateCategory = async (id, name) => { const response = await client.put(`/categories/${id}`, { name }); invalidateApiCache([...referencePrefixes, ...inventoryPrefixes]); return response.data; };
export const deleteCategory = async (id) => { const response = await client.delete(`/categories/${id}`); invalidateApiCache([...referencePrefixes, ...inventoryPrefixes]); return response.data; };

// frontend/src/api/classifications.js
export const fetchClassifications = (category_id, options = {}) => cachedGet('/classifications', { params: category_id ? { category_id } : {}, ttl: 300_000, ...options });
export const createClassification = async (category_id, classification_name) => { const response = await client.post('/classifications', { category_id, classification_name }); invalidateApiCache(referencePrefixes); return response.data; };
export const updateClassification = async (id, classification_name) => { const response = await client.put(`/classifications/${id}`, { classification_name }); invalidateApiCache([...referencePrefixes, ...inventoryPrefixes]); return response.data; };
export const deleteClassification = async (id) => { const response = await client.delete(`/classifications/${id}`); invalidateApiCache([...referencePrefixes, ...inventoryPrefixes]); return response.data; };

export const restoreItem = async (id) => { const response = await client.put(`/items/${id}/restore`); invalidateInventory(); return response.data; };
