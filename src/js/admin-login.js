import { signIn, getCurrentUser } from './supabase.js';
import { isLoggedIn } from './auth.js';

async function checkAlreadyLoggedIn() {
  if (await isLoggedIn()) {
    const user = await getCurrentUser();
    if (user?.is_admin) {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/index.html';
    }
  }
}

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('message');

  messageEl.innerHTML = '<div class="alert alert-info">Logging in...</div>';

  try {
    await signIn(email, password);

    const user = await getCurrentUser();

    if (!user?.is_admin) {
      messageEl.innerHTML = '<div class="alert alert-error">Access denied. You do not have admin privileges.</div>';
      return;
    }

    messageEl.innerHTML = '<div class="alert alert-success">Admin login successful! Redirecting...</div>';
    setTimeout(() => {
      window.location.href = '/admin.html';
    }, 1000);
  } catch (error) {
    messageEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  }
});

checkAlreadyLoggedIn();
