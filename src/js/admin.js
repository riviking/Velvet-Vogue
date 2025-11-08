import { supabase, signOut } from './supabase.js';
import { checkAuth } from './auth.js';

let user = null;
let editingProductId = null;

async function loadAuthStatus() {
  user = await checkAuth(true);
  if (!user) return;

  const authStatusEl = document.getElementById('auth-status');
  authStatusEl.innerHTML = `
    <span>Welcome, ${user.full_name || 'Admin'}!</span>
    <button class="btn btn-secondary" style="margin-left: 20px; padding: 5px 15px; font-size: 14px;" onclick="logout()">Logout</button>
  `;
}

window.logout = async function() {
  if (confirm('Are you sure you want to logout?')) {
    await signOut();
    window.location.href = '/index.html';
  }
};

async function loadProducts() {
  const container = document.getElementById('products-container');

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="alert alert-error">Failed to load products</p>';
    return;
  }

  if (!products || products.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No products yet</h3><p>Add your first product to get started!</p></div>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; background: white; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-sm);">
      <thead style="background-color: var(--primary-color); color: white;">
        <tr>
          <th style="padding: 15px; text-align: left;">Image</th>
          <th style="padding: 15px; text-align: left;">Name</th>
          <th style="padding: 15px; text-align: left;">Category</th>
          <th style="padding: 15px; text-align: left;">Price</th>
          <th style="padding: 15px; text-align: left;">Stock</th>
          <th style="padding: 15px; text-align: left;">Status</th>
          <th style="padding: 15px; text-align: center;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(product => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 15px;">
              <img src="${product.image_url || 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600'}"
                   alt="${product.name}"
                   style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
            </td>
            <td style="padding: 15px;">
              <strong>${product.name}</strong><br>
              <small style="color: var(--text-light);">${product.description || ''}</small>
            </td>
            <td style="padding: 15px;">${product.category}</td>
            <td style="padding: 15px; font-weight: bold; color: var(--secondary-color);">$${parseFloat(product.price).toFixed(2)}</td>
            <td style="padding: 15px;">${product.stock_quantity}</td>
            <td style="padding: 15px;">
              ${product.is_featured ? '<span style="background: var(--accent-color); color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; margin-right: 5px;">Featured</span>' : ''}
              ${product.is_new_arrival ? '<span style="background: var(--success-color); color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">New</span>' : ''}
            </td>
            <td style="padding: 15px; text-align: center;">
              <button class="btn btn-outline" style="padding: 5px 15px; margin-right: 5px;" onclick="editProduct('${product.id}')">Edit</button>
              <button class="btn btn-secondary" style="padding: 5px 15px;" onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadOrders() {
  const container = document.getElementById('orders-container');

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (full_name, email),
      order_items (
        *,
        products (name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="alert alert-error">Failed to load orders</p>';
    return;
  }

  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No orders yet</h3></div>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; background: white; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-sm);">
      <thead style="background-color: var(--primary-color); color: white;">
        <tr>
          <th style="padding: 15px; text-align: left;">Order ID</th>
          <th style="padding: 15px; text-align: left;">Customer</th>
          <th style="padding: 15px; text-align: left;">Date</th>
          <th style="padding: 15px; text-align: left;">Total</th>
          <th style="padding: 15px; text-align: left;">Status</th>
          <th style="padding: 15px; text-align: center;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 15px;"><strong>#${order.id.substring(0, 8).toUpperCase()}</strong></td>
            <td style="padding: 15px;">
              ${order.profiles?.full_name || 'Unknown'}<br>
              <small style="color: var(--text-light);">${order.profiles?.email || ''}</small>
            </td>
            <td style="padding: 15px;">${new Date(order.created_at).toLocaleDateString()}</td>
            <td style="padding: 15px; font-weight: bold; color: var(--secondary-color);">$${parseFloat(order.total_amount).toFixed(2)}</td>
            <td style="padding: 15px;">
              <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding: 5px 10px; border: 1px solid var(--border-color); border-radius: 5px;">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
            <td style="padding: 15px; text-align: center;">
              <button class="btn btn-outline" style="padding: 5px 15px;" onclick="viewOrderDetails('${order.id}')">View</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadFeedback() {
  const container = document.getElementById('feedback-container');

  const { data: feedback, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="alert alert-error">Failed to load feedback</p>';
    return;
  }

  if (!feedback || feedback.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No feedback yet</h3></div>';
    return;
  }

  container.innerHTML = feedback.map(item => `
    <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: var(--shadow-sm); margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
        <div>
          <h4 style="margin-bottom: 5px;">${item.name}</h4>
          <p style="color: var(--text-light); font-size: 14px;">${item.email}</p>
        </div>
        <span style="color: var(--text-light); font-size: 14px;">${new Date(item.created_at).toLocaleDateString()}</span>
      </div>
      <p style="font-weight: 600; margin-bottom: 10px;">Subject: ${item.subject}</p>
      <p style="color: var(--text-dark);">${item.message}</p>
    </div>
  `).join('');
}

document.getElementById('add-product-btn').onclick = () => {
  editingProductId = null;
  document.getElementById('modal-title').textContent = 'Add New Product';
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('product-modal').classList.add('active');
};

document.getElementById('close-product').onclick = () => {
  document.getElementById('product-modal').classList.remove('active');
};

window.editProduct = async function(productId) {
  editingProductId = productId;
  document.getElementById('modal-title').textContent = 'Edit Product';

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !product) {
    alert('Failed to load product');
    return;
  }

  document.getElementById('product-id').value = product.id;
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-stock').value = product.stock_quantity;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-gender').value = product.gender || '';
  document.getElementById('product-image').value = product.image_url || '';
  document.getElementById('product-sizes').value = product.sizes ? product.sizes.join(', ') : '';
  document.getElementById('product-colors').value = product.colors ? product.colors.join(', ') : '';
  document.getElementById('product-featured').checked = product.is_featured;
  document.getElementById('product-new').checked = product.is_new_arrival;

  document.getElementById('product-modal').classList.add('active');
};

window.deleteProduct = async function(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    alert('Failed to delete product: ' + error.message);
    return;
  }

  alert('Product deleted successfully!');
  loadProducts();
};

window.updateOrderStatus = async function(orderId, newStatus) {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    alert('Failed to update order status');
    return;
  }

  alert('Order status updated successfully!');
};

window.viewOrderDetails = async function(orderId) {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (full_name, email),
      order_items (
        *,
        products (*)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    alert('Failed to load order details');
    return;
  }

  const details = `
Order ID: #${order.id.substring(0, 8).toUpperCase()}
Customer: ${order.profiles?.full_name || 'Unknown'}
Email: ${order.profiles?.email || 'N/A'}
Date: ${new Date(order.created_at).toLocaleDateString()}
Total: $${parseFloat(order.total_amount).toFixed(2)}
Status: ${order.status}

Shipping Address:
${order.shipping_address}

Items:
${order.order_items.map(item => `- ${item.products.name} x${item.quantity} - $${(parseFloat(item.price) * item.quantity).toFixed(2)}`).join('\n')}
  `;

  alert(details);
};

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageEl = document.getElementById('product-message');
  messageEl.innerHTML = '<div class="alert alert-info">Saving product...</div>';

  const productData = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: parseFloat(document.getElementById('product-price').value),
    stock_quantity: parseInt(document.getElementById('product-stock').value),
    category: document.getElementById('product-category').value,
    gender: document.getElementById('product-gender').value || null,
    image_url: document.getElementById('product-image').value || null,
    sizes: document.getElementById('product-sizes').value
      ? document.getElementById('product-sizes').value.split(',').map(s => s.trim())
      : [],
    colors: document.getElementById('product-colors').value
      ? document.getElementById('product-colors').value.split(',').map(c => c.trim())
      : [],
    is_featured: document.getElementById('product-featured').checked,
    is_new_arrival: document.getElementById('product-new').checked
  };

  let error;

  if (editingProductId) {
    const result = await supabase
      .from('products')
      .update(productData)
      .eq('id', editingProductId);
    error = result.error;
  } else {
    const result = await supabase
      .from('products')
      .insert([productData]);
    error = result.error;
  }

  if (error) {
    messageEl.innerHTML = `<div class="alert alert-error">Failed to save product: ${error.message}</div>`;
    return;
  }

  messageEl.innerHTML = '<div class="alert alert-success">Product saved successfully!</div>';

  setTimeout(() => {
    document.getElementById('product-modal').classList.remove('active');
    loadProducts();
  }, 1500);
});

loadAuthStatus();
loadProducts();
loadOrders();
loadFeedback();
