document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.getElementById('productsGrid');
    const searchBar = document.querySelector('.search-bar');
    const categoryLinks = document.querySelectorAll('.category-filter .list-group-item');
    let currentCategory = 'All Products';

    // Sample products data (in a real app, this would come from an API)
    const products = [
        {
            id: 1,
            name: 'Paracetamol 500mg',
            category: 'Over-the-Counter',
            price: 29.99,
            image: '/images/PYREMUST-650-TAB.jpg',
            description: 'Pain reliever and fever reducer - Pack of 15 tablets'
        },
        {
            id: 2,
            name: 'Digital Thermometer',
            category: 'Healthcare Devices',
            price: 199.99,
            image: '/images/liveasy-digital-thermometer-let-01-1-nos-2-1747217882.webp',
            description: 'High accuracy digital thermometer with flexible tip'
        },
        {
            id: 3,
            name: 'Vitamin C 1000mg',
            category: 'Vitamins & Supplements',
            price: 149.99,
            image: '/images/front-2.jpg',
            description: 'Immune system support - Pack of 30 tablets'
        },
        // Add more products as needed
    ];

    // Initialize cart
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Render products with Indian Rupee symbol
    function renderProducts(products) {
        productsGrid.innerHTML = products.map(product => `
            <div class="col">
                <div class="card product-card h-100">
                    <img src="${product.image}" class="card-img-top product-image" alt="${product.name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h5 mb-0">₹${product.price.toFixed(2)}</span>
                            <button class="btn btn-primary" onclick="addToCart(${product.id})">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Filter products by category
    function filterProducts(category) {
        if (category === 'All Products') {
            return products;
        }
        return products.filter(product => product.category === category);
    }

    // Search products
    function searchProducts(query) {
        return products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.description.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Add to cart
    window.addToCart = function(productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            const existingItem = cart.find(item => item.id === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartBadge();
        }
    };

    // Update cart badge
    function updateCartBadge() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.querySelector('.cart-badge');
        if (badge) {
            badge.textContent = totalItems;
        }
    }

    // Event Listeners
    searchBar.addEventListener('input', (e) => {
        const query = e.target.value;
        const filteredProducts = searchProducts(query);
        renderProducts(filteredProducts);
    });

    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Update active state
            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            // Filter products
            currentCategory = link.textContent;
            const filteredProducts = filterProducts(currentCategory);
            renderProducts(filteredProducts);
        });
    });

    // Initial render
    renderProducts(products);
    updateCartBadge();
}); 