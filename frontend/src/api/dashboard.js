// frontend/src/api/dashboard.js
import client from './client.js';

// Replaces: all 5 individual PHP $conn->query() calls + foreach loops
export const fetchDashboardData = () => client.get('/dashboard').then(r => r.data);