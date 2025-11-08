import { supabase, getCurrentUser } from './supabase.js';
import { checkAuth } from './auth.js';

let cartItems = [];
let user = null;

async function loadAuthStatus() {
  try {
    user = await checkAuth();
    console.log('Auth check result:', !!user, user);
    if (!user) return null;

    const authStatusEl = document.getElementById('auth-status');
    if (authStatusEl) authStatusEl.innerHTML = `Welcome, ${user?.full_name || 'User'}!`;

    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) profileBtn.onclick = () => window.location.href = '/profile.html';

    return user;
  } catch (err) {
    console.error('loadAuthStatus error:', err);
    return null;
  }
}

async function loadCart() {
  const container = document.getElementById('cart-items-container');
  if (!container) {
    console.error('cart: cart-items-container not found');
    return;
  }

  // Show loading UI
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your cart...</p>
    </div>
  `;

  if (!user) {
    // If user not logged in, prompt to login
    container.innerHTML = `
      <div class="empty-state">
        <h3>Please sign in</h3>
        <p>You must be signed in to view your cart.</p>
        <a href="/login.html" class="btn btn-primary">Login</a>
      </div>
    `;
    updateSummary();
    updateCartCount();
    return;
  }

  try {
    console.log('Fetching cart for user_id:', user.id);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (*)
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase cart fetch error:', error);
      container.innerHTML = `<p class="alert alert-error">Failed to load cart: ${error.message}</p>`;
      return;
    }

    cartItems = data || [];

    if (cartItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Your cart is empty</h3>
          <p>Add some products to get started!</p>
          <a href="/products.html" class="btn btn-primary">Browse Products</a>
        </div>
      `;
      updateSummary();
      updateCartCount();
      return;
    }

    container.innerHTML = cartItems.map(item => `
      <div class="cart-item">
        <img src="${item.products?.image_url || 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600'}" alt="${item.products?.name}" class="cart-item-image">
        <div class="cart-item-details">
          <h3 class="cart-item-name">${item.products?.name}</h3>
          <p class="cart-item-meta">${item.products?.category || ''}</p>
          ${item.size ? `<p class="cart-item-meta">Size: ${item.size}</p>` : ''}
          ${item.color ? `<p class="cart-item-meta">Color: ${item.color}</p>` : ''}
          <div class="cart-item-price">$${(parseFloat(item.products?.price || 0) * item.quantity).toFixed(2)}</div>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-control">
            <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
          </div>
          <button class="btn btn-secondary" onclick="removeItem('${item.id}')">Remove</button>
        </div>
      </div>
    `).join('');

    updateSummary();
    updateCartCount();
  } catch (err) {
    console.error('loadCart unexpected error:', err);
    container.innerHTML = `<p class="alert alert-error">Unexpected error loading cart</p>`;
  }
}

function updateSummary() {
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item?.products?.price || 0) * item.quantity);
  }, 0);

  const shipping = subtotal >= 100 ? 0 : 10;
  const total = subtotal + shipping;

  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const totalEl = document.getElementById('total');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

async function updateCartCount() {
  if (!user) {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = '0';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', user.id);

    if (!error && data) {
      const count = data.reduce((sum, item) => sum + item.quantity, 0);
      const cartCountEl = document.getElementById('cart-count');
      if (cartCountEl) cartCountEl.textContent = count;
    }
  } catch (err) {
    console.error('updateCartCount error:', err);
  }
}

window.updateQuantity = async function(itemId, newQuantity) {
  if (!user) { alert('Please login'); window.location.href = '/login.html'; return; }
  if (newQuantity <= 0) { await removeItem(itemId); return; }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: newQuantity })
    .eq('id', itemId);

  if (error) {
    alert('Failed to update quantity');
    return;
  }

  await loadCart();
};

window.removeItem = async function(itemId) {
  if (!confirm('Remove this item from cart?')) return;

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    alert('Failed to remove item');
    return;
  }

  await loadCart();
};

document.getElementById('checkout-btn')?.addEventListener('click', () => {
  if (cartItems.length === 0) {
    alert('Your cart is empty!');
    return;
  }

  const modal = document.getElementById('checkout-modal');
  modal?.classList.add('active');

  const address = user?.address || '';
  const addrEl = document.getElementById('shipping-address');
  if (addrEl) addrEl.value = address;
});

document.getElementById('close-checkout')?.addEventListener('click', () => {
  document.getElementById('checkout-modal')?.classList.remove('active');
});

document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!user) { alert('Please login'); window.location.href = '/login.html'; return; }

  const shippingAddress = document.getElementById('shipping-address')?.value || '';
  const messageEl = document.getElementById('checkout-message');

  if (messageEl) messageEl.innerHTML = '<div class="alert alert-info">Processing your order...</div>';

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (parseFloat(item.products.price) * item.quantity);
  }, 0);

  const shipping = subtotal >= 100 ? 0 : 10;
  const total = subtotal + shipping;

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
        total_amount: total,
        status: 'pending',
        shipping_address: shippingAddress
      }])
      .select()
      .single();

    if (orderError) {
      if (messageEl) messageEl.innerHTML = `<div class="alert alert-error">Failed to create order: ${orderError.message}</div>`;
      return;
    }

    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      price: item.products.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      if (messageEl) messageEl.innerHTML = `<div class="alert alert-error">Failed to save order items: ${itemsError.message}</div>`;
      return;
    }

    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (messageEl) messageEl.innerHTML = '<div class="alert alert-success">Order placed successfully!</div>';

    setTimeout(() => {
      window.location.href = '/profile.html';
    }, 1500);
  } catch (err) {
    console.error('Checkout error:', err);
    if (messageEl) messageEl.innerHTML = `<div class="alert alert-error">Unexpected error: ${err.message}</div>`;
  }
});

// initialize after auth resolves
(async function init() {
  await loadAuthStatus();
  await loadCart();
})();
