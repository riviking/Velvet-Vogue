import { supabase, getCurrentUser } from './supabase.js';
import { isLoggedIn } from './auth.js';

let allProducts = [];
let filters = {
  category: 'all',
  gender: 'all',
  price: 'all',
  search: ''
};

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

async function loadProducts() {
  const container = document.getElementById('products-container');
  
  try {
    if (!container) {
      console.error('Products container not found');
      return;
    }

    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading products...</p>
      </div>
    `;

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    console.log('Starting Supabase query with filters:', filters);
    
    // Build query with filters
    let query = supabase
      .from('products')
      .select('*');

    // Apply category filter in SQL
    if (filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    // Apply gender filter in SQL
    if (filters.gender !== 'all') {
      query = query.eq('gender', filters.gender);
    }

    // Apply price filter in SQL
    if (filters.price !== 'all') {
      switch (filters.price) {
        case '0-50':
          query = query.lte('price', 50);
          break;
        case '50-100':
          query = query.gte('price', 50).lte('price', 100);
          break;
        case '100-200':
          query = query.gte('price', 100).lte('price', 200);
          break;
        case '200+':
          query = query.gte('price', 200);
          break;
      }
    }

    // Add search filter if present
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
    }

    // Final ordering
    query = query.order('created_at', { ascending: false });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 10s')), 10000)
    );

    const { data: products, error } = await Promise.race([
      query,
      timeoutPromise
    ]);

    console.log('Query complete:', {
      hasError: !!error,
      productsReceived: !!products,
      productCount: products?.length,
      error: error?.message
    });

    if (error) throw error;

    if (!products || products.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No products found</h3>
          <p>Try adjusting your filters or check back later.</p>
        </div>
      `;
      return;
    }

    allProducts = products;
    console.log('Rendering products:', allProducts.length);
    displayProducts();

  } catch (err) {
    console.error('Failed to load products:', err);
    container.innerHTML = `
      <div class="error-state">
        <h3>Error Loading Products</h3>
        <p>${err.message}</p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          Try Again
        </button>
      </div>
    `;
  }
}

function displayProducts() {
  const container = document.getElementById('products-container');

  let filtered = allProducts.filter(product => {
    if (filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }

    if (filters.gender !== 'all' && product.gender !== filters.gender) {
      return false;
    }

    if (filters.price !== 'all') {
      const price = parseFloat(product.price);
      if (filters.price === '0-50' && price > 50) return false;
      if (filters.price === '50-100' && (price < 50 || price > 100)) return false;
      if (filters.price === '100-200' && (price < 100 || price > 200)) return false;
      if (filters.price === '200+' && price < 200) return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return product.name.toLowerCase().includes(searchLower) ||
             product.description?.toLowerCase().includes(searchLower) ||
             product.category.toLowerCase().includes(searchLower);
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try adjusting your filters or search terms</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => `
    <div class="product-card">
      <div style="position: relative;">
        <img src="${product.image_url || 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=600'}" alt="${product.name}" class="product-image">
        ${product.is_new_arrival ? '<span class="product-badge">New</span>' : ''}
        ${product.is_featured ? '<span class="product-badge" style="top: 50px;">Featured</span>' : ''}
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

document.querySelectorAll('.filter-tag').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const filterType = e.target.dataset.type;
    const filterValue = e.target.dataset.filter;

    document.querySelectorAll(`[data-type="${filterType}"]`).forEach(b => {
      b.classList.remove('active');
    });
    e.target.classList.add('active');

    filters[filterType] = filterValue;
    displayProducts();
  });
});

document.getElementById('search-input').addEventListener('input', (e) => {
  filters.search = e.target.value;
  displayProducts();
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

// Add CSS for loading state
const style = document.createElement('style');
style.textContent = `
  .loading {
    text-align: center;
    padding: 2rem;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    margin: 0 auto 1rem;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .error-state {
    padding: 2rem;
    background: #fff1f0;
    border-radius: 8px;
    margin: 1rem 0;
  }
  .error-state pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
  }
`;
document.head.appendChild(style);

loadAuthStatus();
loadCartCount();
loadProducts();
