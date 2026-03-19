// frontend/src/api/admin.js
import client from './client.js';

// Stats
export const fetchAdminStats    = ()          => client.get('/admin/stats').then(r => r.data);

// Activity log
export const fetchActivityLog   = (params)    => client.get('/admin/activity', { params }).then(r => r.data);

// Item movement
export const fetchItemMovement  = (params)    => client.get('/admin/item-movement', { params }).then(r => r.data);

// User report
export const fetchUserReport    = (userId, params) => client.get(`/admin/user-report/${userId}`, { params }).then(r => r.data);

// Users CRUD
export const fetchUsers         = ()          => client.get('/users').then(r => r.data);
export const createUser         = (data)      => client.post('/users', data).then(r => r.data);
export const updateUser         = (id, data)  => client.put(`/users/${id}`, data).then(r => r.data);
export const deleteUser         = (id)        => client.delete(`/users/${id}`).then(r => r.data);