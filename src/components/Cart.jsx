import React from 'react';
import { useCart } from '../contexts/CartContext';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaMinus, FaPlus, FaShoppingCart } from 'react-icons/fa';
import './Cart.css';

const Cart = () => {
  const { t } = useTranslation();
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    cartTotal,
    itemCount 
  } = useCart();

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <FaShoppingCart size={48} />
        <h2>{t('cart.empty')}</h2>
        <p>{t('cart.addItems')}</p>
        <Link to="/products" className="continue-shopping">
          {t('cart.continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>{t('cart.title')}</h1>
        <button onClick={clearCart} className="clear-cart">
          {t('cart.clearCart')}
        </button>
      </div>

      <div className="cart-items">
        {cart.items.map((item) => (
          <div key={item.id} className="cart-item">
            <img 
              src={item.images?.[0] || '/placeholder-product.jpg'} 
              alt={item.title} 
              className="cart-item-image"
            />
            <div className="cart-item-details">
              <h3>{item.title}</h3>
              <p className="price">${item.price.toFixed(2)}</p>
              <div className="quantity-selector">
                <button 
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  <FaMinus />
                </button>
                <span>{item.quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <FaPlus />
                </button>
              </div>
            </div>
            <div className="cart-item-total">
              <p>${(item.price * item.quantity).toFixed(2)}</p>
              <button 
                onClick={() => removeFromCart(item.id)}
                className="remove-item"
                aria-label="Remove item"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>{t('cart.subtotal')}</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>{t('cart.shipping')}</span>
          <span>{t('cart.freeShipping')}</span>
        </div>
        <div className="summary-row total">
          <span>{t('cart.total')}</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <button className="checkout-button">
          {t('cart.proceedToCheckout')}
        </button>
        <Link to="/products" className="continue-shopping">
          {t('cart.continueShopping')}
        </Link>
      </div>
    </div>
  );
};

export default Cart;
