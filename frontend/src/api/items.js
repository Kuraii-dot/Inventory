// frontend/src/api/items.js
// Replaces: all fetch() calls in front/js/items.js and inline PHP fetches

import client from './client.js';

export const fetchItems         = (params) => client.get('/items', { params }).then(r => r.data);
export const fetchAllOverview   = ()        => client.get('/items/all-overview').then(r => r.data);
export const fetchItemsByCategory      = (category_id)       => client.get('/items/by-category',       { params: { category_id } }).then(r => r.data);
export const fetchItemsByClassification = (classification_id) => client.get('/items/by-classification', { params: { classification_id } }).then(r => r.data);
export const fetchItemById      = (id)      => client.get(`/items/${id}`).then(r => r.data);
export const createItem         = (data)    => client.post('/items', data).then(r => r.data);
export const updateItem         = (id, data)=> client.put(`/items/${id}`, data).then(r => r.data);
export const deleteItem         = (id)      => client.delete(`/items/${id}`).then(r => r.data);
export const validateStock      = (item_id, quantity) => client.get('/items/validate-stock', { params: { item_id, quantity } }).then(r => r.data);

// frontend/src/api/suppliers.js
export const fetchSuppliers   = ()         => client.get('/suppliers').then(r => r.data);
export const createSupplier   = (name)     => client.post('/suppliers', { name }).then(r => r.data);
export const updateSupplier   = (id, name) => client.put(`/suppliers/${id}`, { name }).then(r => r.data);
export const deleteSupplier   = (id)       => client.delete(`/suppliers/${id}`).then(r => r.data);

// frontend/src/api/categories.js
export const fetchCategories  = ()         => client.get('/categories').then(r => r.data);
export const createCategory   = (name)     => client.post('/categories', { name }).then(r => r.data);
export const updateCategory   = (id, name) => client.put(`/categories/${id}`, { name }).then(r => r.data);
export const deleteCategory   = (id)       => client.delete(`/categories/${id}`).then(r => r.data);

// frontend/src/api/classifications.js
export const fetchClassifications = (category_id) => client.get('/classifications', { params: category_id ? { category_id } : {} }).then(r => r.data);
export const createClassification = (category_id, classification_name) => client.post('/classifications', { category_id, classification_name }).then(r => r.data);