// frontend/src/api/dashboard.js
import { cachedGet } from './cache.js';

// Replaces: all 5 individual PHP $conn->query() calls + foreach loops
export const fetchDashboardData = (options = {}) => cachedGet('/dashboard', { ttl: 30_000, ...options });
