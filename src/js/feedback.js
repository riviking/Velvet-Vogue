import { supabase, getCurrentUser } from './supabase.js';
import { isLoggedIn } from './auth.js';

async function loadAuthStatus() {
  const authStatusEl = document.getElementById('auth-status');
  const profileBtn = document.getElementById('profile-btn');
  const loggedIn = await isLoggedIn();

  if (loggedIn) {
    const user = await getCurrentUser();
    authStatusEl.innerHTML = `Welcome, ${user?.full_name || 'User'}!`;
    profileBtn.onclick = () => window.location.href = '/profile.html';

    document.getElementById('name').value = user.full_name || '';
    document.getElementById('email').value = user.email || '';
  } else {
    authStatusEl.innerHTML = `<a href="/login.html" style="color: white; text-decoration: none;">Login</a> | <a href="/register.html" style="color: white; text-decoration: none;">Register</a>`;
    profileBtn.onclick = () => window.location.href = '/login.html';
  }
}

async function loadCartCount() {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    document.getElementById('cart-count').textContent = '0';
    return;
  }

  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', user.id);

  if (!error && data) {
    const count = data.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
  }
}

document.getElementById('feedback-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageEl = document.getElementById('feedback-message');
  messageEl.innerHTML = '<div class="alert alert-info">Sending your message...</div>';

  const loggedIn = await isLoggedIn();
  let userId = null;

  if (loggedIn) {
    const user = await getCurrentUser();
    userId = user.id;
  }

  const feedbackData = {
    user_id: userId,
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    subject: document.getElementById('subject').value,
    message: document.getElementById('message').value
  };

  const { error } = await supabase
    .from('feedback')
    .insert([feedbackData]);

  if (error) {
    messageEl.innerHTML = `<div class="alert alert-error">Failed to send message: ${error.message}</div>`;
    return;
  }

  messageEl.innerHTML = '<div class="alert alert-success">Thank you for your message! We\'ll get back to you soon.</div>';
  document.getElementById('feedback-form').reset();

  if (loggedIn) {
    const user = await getCurrentUser();
    document.getElementById('name').value = user.full_name || '';
    document.getElementById('email').value = user.email || '';
  }
});

document.getElementById('cart-btn').onclick = async () => {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    alert('Please login to view cart');
    window.location.href = '/login.html';
    return;
  }
  window.location.href = '/cart.html';
};

loadAuthStatus();
loadCartCount();
