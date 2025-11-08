import { signIn } from './supabase.js';
import { isLoggedIn } from './auth.js';

async function checkAlreadyLoggedIn() {
  if (await isLoggedIn()) {
    window.location.href = '/index.html';
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('message');

  messageEl.innerHTML = '<div class="alert alert-info">Logging in...</div>';

  try {
    await signIn(email, password);
    messageEl.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1000);
  } catch (error) {
    messageEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  }
});

checkAlreadyLoggedIn();
