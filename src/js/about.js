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
