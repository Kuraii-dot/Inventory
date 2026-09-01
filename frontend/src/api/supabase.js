import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey || publishableKey.startsWith('PASTE_')) {
  throw new Error('Smart Inventory cloud settings are incomplete. Configure the Supabase URL and publishable key before building.');
}

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

let currentAccessToken = null;
let initialSessionPromise = null;

supabase.auth.onAuthStateChange((_event, session) => {
  currentAccessToken = session?.access_token || null;
});

export async function getAccessToken() {
  if (currentAccessToken) return currentAccessToken;
  initialSessionPromise ??= supabase.auth.getSession()
    .then(({ data }) => {
      currentAccessToken = data.session?.access_token || null;
      return currentAccessToken;
    })
    .finally(() => { initialSessionPromise = null; });
  return initialSessionPromise;
}

export const inventoryAuthEmail = (username) => {
  const slug = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return `${slug || 'inventory-user'}@inventory.ccwd.invalid`;
};

export { publishableKey };
