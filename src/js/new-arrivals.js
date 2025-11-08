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

async function loadNewArrivals() {
  const container = document.getElementById('new-arrivals-container');

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_new_arrival', true)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="alert alert-error">Failed to load products</p>';
    return;
  }

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No new arrivals yet</h3>
        <p>Check back soon for the latest styles!</p>
        <a href="/products.html" class="btn btn-primary">Browse All Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="product-card">
      <div style="position: relative;">
        <img src="${product.image_url || 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600'}" alt="${product.name}" class="product-image">
        <span class="product-badge">New</span>
      </div>
      <div class="product-info">
        <div class="product-category">${product.category}</div>
        <h3 class="product-name">${product.name}</h3>
        <p style="font-size: 14px; color: var(--text-light); margin-bottom: 10px;">${product.description || ''}</p>
        ${product.sizes && product.sizes.length > 0 ? `<p style="font-size: 12px; color: var(--text-light);">Sizes: ${product.sizes.join(', ')}</p>` : ''}
        ${product.colors && product.colors.length > 0 ? `<p style="font-size: 12px; color: var(--text-light);">Colors: ${product.colors.join(', ')}</p>` : ''}
        <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
        <p style="font-size: 12px; color: var(--text-light); margin-bottom: 10px;">Stock: ${product.stock_quantity} available</p>
        <div class="product-actions">
          <button class="btn btn-primary" onclick="addToCart('${product.id}')" ${product.stock_quantity === 0 ? 'disabled' : ''}>
            ${product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.addToCart = async function(productId) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    alert('Please login to add items to cart');
    window.location.href = '/login.html';
    return;
  }

  const user = await getCurrentUser();

  const { data: existingItem } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingItem) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existingItem.quantity + 1 })
      .eq('id', existingItem.id);

    if (error) {
      alert('Failed to update cart');
      return;
    }
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert([{
        user_id: user.id,
        product_id: productId,
        quantity: 1
      }]);

    if (error) {
      alert('Failed to add to cart');
      return;
    }
  }

  alert('Added to cart successfully!');
  loadCartCount();
};

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
loadNewArrivals();
