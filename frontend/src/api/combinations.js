// frontend/src/api/combinations.js
import client from './client.js';

export const fetchCombinations   = ()          => client.get('/combinations').then(r => r.data);
export const fetchCombinationById = (id)       => client.get(`/combinations/${id}`).then(r => r.data);
export const createCombination   = (data)      => client.post('/combinations', data).then(r => r.data);
export const updateCombination   = (id, data)  => client.put(`/combinations/${id}`, data).then(r => r.data);
export const deleteCombination   = (id)        => client.delete(`/combinations/${id}`).then(r => r.data);

// frontend/src/api/ledger.js
export const fetchItemLedger = (item_id) => client.get(`/ledger/${item_id}`).then(r => r.data);