
let cartCount = 0;
let cartTotal = 0;

const cartCountElement = document.querySelector("#cart-count");
const cartItemsElement = document.querySelector("#cart-items");
const cartTotalElement = document.querySelector("#cart-total");
const cartMessageElement = document.querySelector("#cart-message");

const addToCartButtons = document.querySelectorAll(".add-to-cart");
const clearCartButton = document.querySelector("#clear-cart");

// Add food to cart
addToCartButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const foodName = button.dataset.name;
        const foodPrice = Number(button.dataset.price);

        cartCount++;
        cartTotal += foodPrice;

        updateCart();

        cartMessageElement.textContent =
            foodName + " added to your cart!";

        button.textContent = "Added ✓";

        setTimeout(function () {
            button.textContent = "Add to Cart";
        }, 800);
    });
});

// Update cart details
function updateCart() {
    cartCountElement.textContent = cartCount;
    cartItemsElement.textContent = cartCount;
    cartTotalElement.textContent = "₹" + cartTotal;
}

// Clear cart
clearCartButton.addEventListener("click", function () {
    cartCount = 0;
    cartTotal = 0;

    updateCart();

    cartMessageElement.textContent = "Your cart is empty.";
});
