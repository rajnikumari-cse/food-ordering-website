
const CART_KEY = "foodieCart";
const ORDERS_KEY = "foodieOrders";

const $ = selector => document.querySelector(selector);

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function loadCart() {
    const saved = readStorage(CART_KEY, []);

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
        item &&
        typeof item.name === "string" &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );
}

let cart = loadCart();

const cartCount = $("#cart-count");
const cartItems = $("#cart-items");
const cartTotal = $("#cart-total");
const clearCartButton = $("#clear-cart");
const checkoutForm = $("#checkout-form");
const paymentMessage = $("#payment-message");
const orderConfirmation = $("#order-confirmation");
const orderId = $("#order-id");
const confirmationSummary = $("#confirmation-summary");

const upiDetails = $("#upi-details");
const bankDetails = $("#bank-details");
const cardDetails = $("#card-details");

const upiApp = $("#upi-app");
const bankName = $("#bank-name");
const cardName = $("#card-name");
const cardNumber = $("#card-number");
const cardExpiry = $("#card-expiry");
const cardCvv = $("#card-cvv");

const historyList = $("#order-history-list");

function money(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}

function totalAmount() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function totalQuantity() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function persistCart() {
    const saved = writeStorage(CART_KEY, cart);

    if (!saved) {
        paymentMessage.textContent =
            "Browser storage is unavailable. Cart may not persist after refresh.";
    }

    return saved;
}

// Create elements safely without inserting user input as HTML.
function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

// ADD FOOD
document.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", () => {
        const name = button.dataset.name;
        const price = Number(button.dataset.price);

        if (!name || !Number.isFinite(price) || price <= 0) return;

        const existing = cart.find(item => item.name === name);

        if (existing) {
            existing.quantity++;
        } else {
            cart.push({ name, price, quantity: 1 });
        }

        renderCart();

        const original = button.textContent;
        button.textContent = "Added ✓";

        setTimeout(() => {
            button.textContent = original;
        }, 800);
    });
});

// RENDER CART
function renderCart() {
    cartCount.textContent = totalQuantity();
    cartTotal.textContent = money(totalAmount());
    cartItems.replaceChildren();

    if (cart.length === 0) {
        cartItems.appendChild(
            makeElement("p", "empty-message",
                "Your cart is empty. Add some delicious food!")
        );
    }

    cart.forEach(item => {
        const row = makeElement("div", "cart-item");
        const info = makeElement("div", "cart-item-info");

        info.appendChild(makeElement("h4", "", item.name));
        info.appendChild(makeElement(
            "p", "",
            `${money(item.price)} each · Subtotal: ${money(item.price * item.quantity)}`
        ));

        const actions = makeElement("div", "cart-item-actions");

        const decrease = makeElement("button", "quantity-btn", "−");
        decrease.type = "button";
        decrease.setAttribute("aria-label", "Decrease " + item.name);

        decrease.addEventListener("click", () => {
            item.quantity--;

            if (item.quantity <= 0) {
                cart.splice(cart.indexOf(item), 1);
            }

            renderCart();
        });

        const quantity = makeElement("span", "quantity", String(item.quantity));

        const increase = makeElement("button", "quantity-btn", "+");
        increase.type = "button";
        increase.setAttribute("aria-label", "Increase " + item.name);

        increase.addEventListener("click", () => {
            item.quantity++;
            renderCart();
        });

        const remove = makeElement("button", "remove-btn", "Remove");
        remove.type = "button";

        remove.addEventListener("click", () => {
            cart.splice(cart.indexOf(item), 1);
            renderCart();
        });

        actions.append(decrease, quantity, increase, remove);
        row.append(info, actions);
        cartItems.appendChild(row);
    });

    persistCart();
}

// CLEAR CART
clearCartButton.addEventListener("click", () => {
    cart = [];
    renderCart();
    paymentMessage.textContent = "";
});

// PAYMENT OPTIONS
function updatePaymentDetails() {
    const method = $('input[name="paymentMethod"]:checked')?.value;

    upiDetails.hidden = method !== "upi";
    bankDetails.hidden = method !== "netbanking";
    cardDetails.hidden = method !== "card";

    paymentMessage.textContent = "";
}

document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener("change", updatePaymentDetails);
});

// Demo card input formatting. Never use real card details.
cardNumber.addEventListener("input", () => {
    const digits = cardNumber.value.replace(/\D/g, "").slice(0, 16);
    cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
});

cardExpiry.addEventListener("input", () => {
    const digits = cardExpiry.value.replace(/\D/g, "").slice(0, 4);

    cardExpiry.value = digits.length > 2
        ? digits.slice(0, 2) + "/" + digits.slice(2)
        : digits;
});

// PAYMENT VALIDATION
function validatePayment(method) {
    if (!method) return "Please select a payment method.";

    if (method === "upi" && !upiApp.value) {
        return "Please select a UPI app.";
    }

    if (method === "netbanking" && !bankName.value) {
        return "Please select a bank.";
    }

    if (method === "card") {
        const digits = cardNumber.value.replace(/\D/g, "");
        const expiry = cardExpiry.value.trim();

        if (!cardName.value.trim() || !/^\d{16}$/.test(digits)) {
            return "Enter a cardholder name and 16-digit demo card number.";
        }

        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
            return "Enter expiry in MM/YY format.";
        }

        const [month, year] = expiry.split("/").map(Number);
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;

        if (
            year < currentYear ||
            (year === currentYear && month < currentMonth)
        ) {
            return "Enter a future expiry date.";
        }

        if (!/^\d{3,4}$/.test(cardCvv.value.trim())) {
            return "Enter a 3 or 4 digit demo CVV.";
        }
    }

    return "";
}

// ORDER HISTORY
function getOrders() {
    const orders = readStorage(ORDERS_KEY, []);
    return Array.isArray(orders) ? orders : [];
}

function renderOrderHistory() {
    historyList.replaceChildren();

    const orders = getOrders();

    if (orders.length === 0) {
        historyList.appendChild(
            makeElement("p", "empty-message", "No orders yet.")
        );
        return;
    }

    orders.forEach(order => {
        const card = makeElement("article", "order-history-card");

        card.appendChild(makeElement("h3", "", "Order " + order.id));
        card.appendChild(makeElement("p", "", "Date: " + order.date));
        card.appendChild(makeElement("p", "", "Customer: " + order.customerName));

        const list = document.createElement("ul");

        order.items.forEach(item => {
            list.appendChild(makeElement(
                "li", "",
                `${item.name} × ${item.quantity} — ${money(item.price * item.quantity)}`
            ));
        });

        card.appendChild(list);
        card.appendChild(makeElement("p", "", "Total: " + money(order.total)));
        card.appendChild(makeElement("p", "", "Payment: " + order.paymentMethod));
        card.appendChild(makeElement("span", "order-status", "Demo order placed"));

        historyList.appendChild(card);
    });
}

// PLACE DEMO ORDER
checkoutForm.addEventListener("submit", event => {
    event.preventDefault();
    paymentMessage.textContent = "";

    if (cart.length === 0) {
        paymentMessage.textContent =
            "Your cart is empty. Please add food before placing an order.";
        $("#menu").scrollIntoView({ behavior: "smooth" });
        return;
    }

    if (!checkoutForm.reportValidity()) return;

    const method = $('input[name="paymentMethod"]:checked')?.value;
    const paymentError = validatePayment(method);

    if (paymentError) {
        paymentMessage.textContent = paymentError;
        return;
    }

    const paymentNames = {
        cod: "Cash on Delivery",
        upi: upiApp.value,
        netbanking: bankName.value,
        card: "Debit / Credit Card (Demo)"
    };

    const order = {
        id: "FD" + Date.now().toString().slice(-8),
        customerName: $("#customer-name").value.trim(),
        phone: $("#customer-phone").value.trim(),
        address: $("#customer-address").value.trim(),
        items: cart.map(item => ({ ...item })),
        total: totalAmount(),
        paymentMethod: paymentNames[method],
        date: new Date().toLocaleString(),
        status: "Demo order placed"
    };

    // Save the order BEFORE clearing the cart.
    const orders = getOrders();
    orders.unshift(order);

    if (!writeStorage(ORDERS_KEY, orders)) {
        paymentMessage.textContent =
            "Order save nahi ho paya. Browser storage settings check karo.";
        return;
    }

    orderId.textContent = order.id;

    confirmationSummary.textContent =
        `${order.customerName}, ${totalQuantity()} item(s), total ${money(order.total)}. ` +
        `Payment method: ${order.paymentMethod}.`;

    orderConfirmation.hidden = false;

    cart = [];
    renderCart();
    checkoutForm.reset();
    updatePaymentDetails();
    renderOrderHistory();

    orderConfirmation.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});

// NEW ORDER
$("#new-order").addEventListener("click", () => {
    orderConfirmation.hidden = true;
    paymentMessage.textContent = "";
    $("#menu").scrollIntoView({ behavior: "smooth" });
});

// CLEAR ORDER HISTORY
$("#clear-history").addEventListener("click", () => {
    const confirmed = window.confirm(
        "Are you sure you want to delete all saved demo orders?"
    );

    if (!confirmed) return;

    if (writeStorage(ORDERS_KEY, [])) {
        renderOrderHistory();
    }
});

// INITIAL DISPLAY
renderCart();
updatePaymentDetails();
renderOrderHistory();
