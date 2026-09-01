// Shared cart + tracking helpers for the CJA/AJO learning site.
// This file assumes products-data.js is loaded first.

/* ---------- Cart (localStorage-backed, no backend) ---------- */

const CART_KEY = "deepgroove_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(function (item) { return item.id === product.id; });
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: product.id, sku: product.sku, name: product.name, price: product.price, qty: qty });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter(function (item) { return item.id !== productId; });
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartTotal(cart) {
  return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}

function cartItemCount(cart) {
  return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
}

function formatPrice(n) {
  return "$" + n.toFixed(2);
}

function updateCartBadge() {
  const badge = document.querySelector("[data-cart-badge]");
  if (badge) {
    badge.textContent = cartItemCount(getCart());
  }
}

/* ---------- Web SDK / Adobe Experience Platform tracking ----------
   Every function below wraps a call to `alloy("sendEvent", { xdm: {...} })`.
   `alloy` is defined by the Data Collection / Web SDK embed code you paste
   into the <head> of each page (see the site README and Build Guide Phase 3).
   Until you've pasted that code in, these calls are safely skipped and
   logged to the console instead, so the site works either way. */

function hasAlloy() {
  return typeof window.alloy === "function";
}

function sendXdmEvent(xdm) {
  if (hasAlloy()) {
    window.alloy("sendEvent", { xdm: xdm }).catch(function (err) {
      console.warn("[tracking] alloy sendEvent failed:", err);
    });
  } else {
    console.info("[tracking] (alloy not installed yet — would have sent):", xdm);
  }
}

function trackPageView() {
  sendXdmEvent({
    eventType: "web.webpagedetails.pageViews"
  });
}

function productToListItem(product, qty) {
  return {
    SKU: product.sku,
    name: product.name,
    priceTotal: +(product.price * (qty || 1)).toFixed(2),
    quantity: qty || 1
  };
}

function trackProductView(product) {
  sendXdmEvent({
    eventType: "commerce.productViews",
    commerce: { productViews: { value: 1 } },
    productListItems: [productToListItem(product, 1)]
  });
}

function trackAddToCart(product, qty) {
  sendXdmEvent({
    eventType: "commerce.productListAdds",
    commerce: { productListAdds: { value: 1 } },
    productListItems: [productToListItem(product, qty)]
  });
}

function trackCheckoutStart(cart) {
  sendXdmEvent({
    eventType: "commerce.checkouts",
    commerce: { checkouts: { value: 1 } },
    productListItems: cart.map(function (item) { return productToListItem(item, item.qty); })
  });
}

function trackPurchase(order, cart) {
  sendXdmEvent({
    eventType: "commerce.purchases",
    commerce: {
      purchases: { value: 1 },
      order: {
        purchaseID: order.purchaseID,
        priceTotal: order.priceTotal
      }
    },
    productListItems: cart.map(function (item) { return productToListItem(item, item.qty); })
  });
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
