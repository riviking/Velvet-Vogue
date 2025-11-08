import { signUp } from './supabase.js';
import { isLoggedIn } from './auth.js';

async function checkAlreadyLoggedIn() {
  if (await isLoggedIn()) {
    window.location.href = '/index.html';
  }
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageEl = document.getElementById('message');

  if (password !== confirmPassword) {
    messageEl.innerHTML = '<div class="alert alert-error">Passwords do not match!</div>';
    return;
  }

  if (password.length < 6) {
    messageEl.innerHTML = '<div class="alert alert-error">Password must be at least 6 characters long!</div>';
    return;
  }

  messageEl.innerHTML = '<div class="alert alert-info">Creating your account...</div>';

  try {
    await signUp(email, password, fullName);
    messageEl.innerHTML = '<div class="alert alert-success">Registration successful! Redirecting to login...</div>';
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
  } catch (error) {
    messageEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  }
});

checkAlreadyLoggedIn();
