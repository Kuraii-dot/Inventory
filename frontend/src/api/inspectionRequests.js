import client from './client.js';
import { cachedGet, invalidateApiCache } from './cache.js';

export const fetchInspectionRequests = (params = {}) =>
  cachedGet('/inspection-requests', { params, ttl: 15_000 });

export const fetchInspectionRequest = id =>
  cachedGet(`/inspection-requests/${id}`, { ttl: 15_000 });

export const fetchInspectionMaterialCatalog = (search = '') =>
  cachedGet('/inspection-requests/catalog/materials', { params: { search: search || undefined }, ttl: 60_000 });

export const updateInspectionPreparation = async (id, payload) => {
  const response = await client.put(`/inspection-requests/${id}/preparation`, payload);
  invalidateApiCache(['/inspection-requests']);
  return response.data;
};

export const releaseInspectionMaterials = async (id, department = 'Engineering') => {
  const response = await client.post(`/inspection-requests/${id}/release`, { department });
  invalidateApiCache(['/inspection-requests', '/items', '/dashboard', '/distributions']);
  return response.data;
};
