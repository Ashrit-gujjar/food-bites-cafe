let menu = [];
let cart = {};

/* ================= LOAD MENU FROM DATABASE ================= */
async function fetchMenu(force = false) {
    try {
        let res = await fetch("/items");
        let data = await res.json();

        let newMenu = data.map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            category: item.category,
            img: item.image || "images/burger.jpg",
            available: item.available
        }));

        let changed = force || newMenu.length !== menu.length;

        if (!changed) {
            for (let i = 0; i < newMenu.length; i++) {
                if (
                    newMenu[i].available !== menu[i]?.available ||
                    newMenu[i].price !== menu[i]?.price
                ) {
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            menu = newMenu;
            loadMenu();
            updateCart();
        }
    } catch (err) {
        console.log("Error loading menu:", err);
    }
}

/* ================= DISPLAY MENU ================= */
function loadMenu(items = menu) {
    let html = "";

    items.forEach(item => {
        let qty = cart[item.id]?.qty || 0;
        let imagePath = item.img.startsWith("http")
            ? item.img
            : `/${item.img}`;

        let isVeg = ["pizza", "sandwich", "chinese", "desserts"]
            .includes(item.category.toLowerCase());

        let dotClass = isVeg ? "veg-dot" : "nonveg-dot";

        html += `
        <div class="item-card ${!item.available ? "disabledItem" : ""}" id="card-${item.id}">
            <img src="${imagePath}" class="item-img" alt="${item.name}" onerror="this.src='https://placehold.co/400x300?text=Food+Image'">
            <div class="item-info">
                <h3><span class="status-dot ${dotClass}"></span>${item.name}</h3>
                <p class="price">₹${item.price}</p>
                <div class="btn-container" id="btn-container-${item.id}">
                    ${renderButton(item.id, qty, item.available)}
                </div>
            </div>
        </div>`;
    });

    document.getElementById("menu").innerHTML = html;
}

/* ================= BUTTON RENDER ================= */
function renderButton(id, qty, available) {
    if (!available) {
        return `<button class="add-btn" disabled>Out of Stock</button>`;
    }

    // when item not added
    if (qty === 0) {
        return `<button class="add-btn" onclick="addToCart('${id}')">+ Add</button>`;
    }

    // when item is added
    return `
        <div class="qtyBox">
            <button onclick="decreaseQty('${id}')">-</button>
            <span>${qty}</span>
            <button onclick="increaseQty('${id}')">+</button>
        </div>
    `;
}

/* ================= CART LOGIC ================= */
function updateItemUI(id) {
    const item = menu.find(m => m.id === id);
    const qty = cart[id]?.qty || 0;

    const container = document.getElementById(`btn-container-${id}`);

    if (container && item) {
        container.innerHTML = renderButton(id, qty, item.available);
    }

    updateCart();
}


function increaseQty(id) {
    if (cart[id]) {
        cart[id].qty++;
        updateItemUI(id);
    }
}

function decreaseQty(id) {
    if (!cart[id]) return;

    cart[id].qty--;

    if (cart[id].qty <= 0) {
        delete cart[id];
    }

    updateItemUI(id);
}

function updateCart() {
    let html = "";
    let total = 0;
    let count = 0;

    Object.values(cart).forEach(item => {
        total += item.price * item.qty;
        count += item.qty;

        html += `
        <div class="cart-row" style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>${item.name} x ${item.qty}</span>
            <span>₹${item.price * item.qty}</span>
        </div>`;
    });

    const cartItemsDiv = document.getElementById("cartItems");

    if (count === 0) {
        html = "<p style='text-align:center; color:#666;'>Your cart is empty</p>";
    } else {
        html += `
        <hr style="border:0; border-top:1px solid #333; margin:10px 0;">
        <h3 style="display:flex; justify-content:space-between;">
            Total: <span>₹${total}</span>
        </h3>`;
    }

    if (cartItemsDiv) {
        cartItemsDiv.innerHTML = html;
    }

    const cartCount = document.getElementById("cartCount");
    if (cartCount) {
        cartCount.innerText = count;
    }
}

/* ================= PLACE ORDER ================= */
async function placeOrder() {
    let table = document.getElementById("table").value;
    let orderItems = Object.values(cart);

    if (!table) return alert("Please enter your table number");
    if (orderItems.length === 0) return alert("Your cart is empty");

    let total = orderItems.reduce(
        (sum, i) => sum + i.price * i.qty,
        0
    );

    try {
        let response = await fetch("/order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: orderItems,
                total,
                table
            })
        });

        if (response.ok) {
            alert("Order Placed Successfully!");
            cart = {};
            document.getElementById("cartPopup").style.display = "none";
            updateCart();
            loadMenu();
        }
    } catch (err) {
        console.error("Order error:", err);
    }
}

/* ================= UI HELPERS ================= */
function filterItems(type) {
    document.querySelectorAll(".filters button")
        .forEach(btn => btn.classList.remove("active"));

    if (event) {
        event.target.classList.add("active");
    }

    if (type === "all") {
        loadMenu();
    } else {
        loadMenu(
            menu.filter(
                m => m.category.toLowerCase() === type.toLowerCase()
            )
        );
    }
}

function toggleCart() {
    let popup = document.getElementById("cartPopup");

    popup.style.display =
        popup.style.display === "block" ? "none" : "block";
}

function handleAdminTap() {
    if (!window.tapCount) window.tapCount = 0;

    window.tapCount++;

    clearTimeout(window.tapTimer);

    window.tapTimer = setTimeout(() => {
        window.tapCount = 0;
    }, 2000);

    if (window.tapCount === 5) {
        window.tapCount = 0;

        let pass = prompt("Enter Admin Password");

        if (pass === "admin123") {
            window.location.href = "admin.html";
        } else if (pass !== null) {
            alert("Incorrect password!");
        }
    }
}

function scrollToMenu() {
    const menuSection = document.getElementById("menuSection");

    if (menuSection) {
        menuSection.style.display = "block";
        menuSection.scrollIntoView({
            behavior: "smooth"
        });
    }
}

/* ================= SCROLL EFFECT ================= */
window.addEventListener("scroll", () => {
    const section = document.getElementById("aboutSection");
    const bar = document.getElementById("glowProgress");

    if (section && bar) {
        const rect = section.getBoundingClientRect();

        const progress = Math.min(
            Math.max(
                (window.innerHeight - rect.top) /
                (rect.height + window.innerHeight),
                0
            ),
            1
        );

        bar.style.height = progress * 100 + "%";
    }

    document.querySelectorAll(".reveal").forEach(el => {
        if (
            el.getBoundingClientRect().top <
            window.innerHeight - 100
        ) {
            el.classList.add("active");
        }
    });
});

/* ================= INITIALIZATION ================= */
setInterval(() => fetchMenu(false), 5000);
fetchMenu(true);