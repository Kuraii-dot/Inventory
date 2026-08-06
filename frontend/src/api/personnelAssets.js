import client from './client.js';

const base = '/personnel-assets';
export const fetchPersonnel = search => client.get(`${base}/personnel`, { params: { search } }).then(r => r.data);
export const createPersonnel = data => client.post(`${base}/personnel`, data).then(r => r.data);
export const updatePersonnel = (id, data) => client.put(`${base}/personnel/${id}`, data).then(r => r.data);
export const archivePersonnel = id => client.delete(`${base}/personnel/${id}`).then(r => r.data);
export const fetchAssignableInventory = () => client.get(`${base}/inventory/assignable`).then(r => r.data);
export const assignAsset = data => client.post(`${base}/assignments`, data).then(r => r.data);
export const fetchPersonnelAssets = id => client.get(`${base}/personnel/${id}/assets`).then(r => r.data);
export const fetchAssetDetails = id => client.get(`${base}/assets/${id}`).then(r => r.data);
export const addMaintenance = (id, data) => client.post(`${base}/assets/${id}/maintenance`, data).then(r => r.data);
export const updateMaintenance = (id, maintenanceId, data) => client.put(`${base}/assets/${id}/maintenance/${maintenanceId}`, data).then(r => r.data);
export const removeMaintenance = (id, maintenanceId) => client.delete(`${base}/assets/${id}/maintenance/${maintenanceId}`).then(r => r.data);
export const returnAsset = (id, data) => client.post(`${base}/assets/${id}/return`, data).then(r => r.data);
export const transferAsset = (id, data) => client.post(`${base}/assets/${id}/transfer`, data).then(r => r.data);
export const phaseOutAsset = (id, data) => client.post(`${base}/assets/${id}/phase-out`, data).then(r => r.data);
export const lookupQrAsset = token => client.get(`${base}/qr/${token}`).then(r => r.data);
