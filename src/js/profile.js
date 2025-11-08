import { supabase, updateProfile, signOut } from './supabase.js';
import { checkAuth } from './auth.js';

let user = null;

async function loadProfile() {
  user = await checkAuth();
  if (!user) return;

  const authStatusEl = document.getElementById('auth-status');
  authStatusEl.innerHTML = `Welcome, ${user.full_name || 'User'}!`;

  document.getElementById('full-name').value = user.full_name || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('phone').value = user.phone || '';
  document.getElementById('address').value = user.address || '';

  if (user.is_admin) {
    document.getElementById('admin-link').innerHTML = `
      <button class="btn btn-primary" onclick="window.location.href='/admin.html'">Admin Panel</button>
    `;
  }
}

async function loadCartCount() {
  const { data, error } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('user_id', user.id);

  if (!error && data) {
    const count = data.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
  }
}

async function loadOrders() {
  const container = document.getElementById('orders-container');

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (*)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="alert alert-error">Failed to load orders</p>';
    return;
  }

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No orders yet</h3>
        <p>Start shopping to see your orders here!</p>
        <a href="/products.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const statusColors = {
      pending: '#f39c12',
      processing: '#3498db',
      shipped: '#9b59b6',
      delivered: '#27ae60',
      cancelled: '#e74c3c'
    };

    return `
      <div style="border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
          <div>
            <h4 style="margin-bottom: 5px;">Order #${order.id.substring(0, 8).toUpperCase()}</h4>
            <p style="color: var(--text-light); font-size: 14px;">${date}</p>
          </div>
          <div style="text-align: right;">
            <span style="background-color: ${statusColors[order.status]}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
              ${order.status}
            </span>
            <p style="font-size: 20px; font-weight: bold; color: var(--primary-color); margin-top: 10px;">$${parseFloat(order.total_amount).toFixed(2)}</p>
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <p style="font-size: 14px; color: var(--text-dark); margin-bottom: 5px;"><strong>Shipping Address:</strong></p>
          <p style="font-size: 14px; color: var(--text-light);">${order.shipping_address}</p>
        </div>

        <div>
          <p style="font-size: 14px; color: var(--text-dark); margin-bottom: 10px;"><strong>Items:</strong></p>
          ${order.order_items.map(item => `
            <div style="display: flex; gap: 15px; padding: 10px; background-color: var(--bg-light); border-radius: 5px; margin-bottom: 10px;">
              <img src="${item.products.image_url || 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600'}"
                   alt="${item.products.name}"
                   style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
              <div style="flex: 1;">
                <p style="font-weight: 600; margin-bottom: 3px;">${item.products.name}</p>
                <p style="font-size: 12px; color: var(--text-light);">Quantity: ${item.quantity}</p>
                ${item.size ? `<p style="font-size: 12px; color: var(--text-light);">Size: ${item.size}</p>` : ''}
                ${item.color ? `<p style="font-size: 12px; color: var(--text-light);">Color: ${item.color}</p>` : ''}
              </div>
              <div style="text-align: right;">
                <p style="font-weight: bold; color: var(--secondary-color);">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageEl = document.getElementById('profile-message');
  messageEl.innerHTML = '<div class="alert alert-info">Updating profile...</div>';

  try {
    await updateProfile({
      full_name: document.getElementById('full-name').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value
    });

    messageEl.innerHTML = '<div class="alert alert-success">Profile updated successfully!</div>';

    setTimeout(() => {
      messageEl.innerHTML = '';
    }, 3000);
  } catch (error) {
    messageEl.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to logout?')) {
    try {
      await signOut();
      window.location.href = '/index.html';
    } catch (error) {
      alert('Failed to logout: ' + error.message);
    }
  }
});

document.getElementById('cart-btn').onclick = () => {
  window.location.href = '/cart.html';
};

document.getElementById('profile-btn').onclick = () => {
  window.location.href = '/profile.html';
};

loadProfile();
loadCartCount();
loadOrders();
