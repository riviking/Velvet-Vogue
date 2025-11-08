import { supabase, checkAuthState, getCurrentUser } from './supabase.js';

export async function checkAuth(requireAdmin = false) {
  const session = await checkAuthState();

  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  const user = await getCurrentUser();

  if (requireAdmin && !user?.is_admin) {
    alert('Access denied. Admin privileges required.');
    window.location.href = '/index.html';
    return null;
  }

  return user;
}

export async function setupAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '/index.html';
    }
  });
}

export async function isLoggedIn() {
  const session = await checkAuthState();
  return !!session;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.is_admin || false;
}
