import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return action.payload;
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, { 
    items: [], 
    loading: false, 
    error: null,
    subtotal: 0,
    total: 0,
    itemCount: 0
  });

  // Get current user uid
  const getCurrentUserUid = () => {
    // Check client user first
    const clientUser = JSON.parse(localStorage.getItem('clientUser') || 'null');
    if (clientUser?.uid) return clientUser.uid;
    
    // Check vendor user
    const vendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null');
    if (vendorUser?.uid) return vendorUser.uid;
    
    return null;
  };

  // Load cart from database on initial render and when user changes
  useEffect(() => {
    const loadCart = async () => {
      const uid = getCurrentUserUid();
      if (!uid) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        console.log('Loading cart for uid:', uid);
        const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}`);
        if (response.ok) {
          const cartData = await response.json();
          console.log('Loaded cart data:', cartData);
          console.log('Cart delivery address:', cartData.deliveryAddress);
          dispatch({ type: 'SET_CART', payload: cartData });
        } else {
          console.error('Failed to load cart, response:', response.status);
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadCart();
  }, []);

  const addToCart = async (product) => {
    const uid = getCurrentUserUid();
    if (!uid) {
      dispatch({ type: 'SET_ERROR', payload: 'Please login to add items to cart' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: product.id || product._id, 
          quantity: product.quantity || 1 
        })
      });

      if (response.ok) {
        const updatedCart = await response.json();
        dispatch({ type: 'SET_CART', payload: updatedCart });
      } else {
        throw new Error('Failed to add item to cart');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item to cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeFromCart = async (itemId) => {
    const uid = getCurrentUserUid();
    if (!uid) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedCart = await response.json();
        dispatch({ type: 'SET_CART', payload: updatedCart });
      } else {
        throw new Error('Failed to remove item from cart');
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove item from cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    const uid = getCurrentUserUid();
    if (!uid) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });

      if (response.ok) {
        const updatedCart = await response.json();
        dispatch({ type: 'SET_CART', payload: updatedCart });
      } else {
        throw new Error('Failed to update quantity');
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update quantity' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearCart = async () => {
    const uid = getCurrentUserUid();
    if (!uid) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedCart = await response.json();
        dispatch({ type: 'SET_CART', payload: updatedCart });
      } else {
        throw new Error('Failed to clear cart');
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateDeliveryAddress = async (addressId) => {
    const uid = getCurrentUserUid();
    if (!uid) return;

    try {
      console.log('Updating delivery address to:', addressId);
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/delivery-address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId })
      });

      if (response.ok) {
        const updatedCart = await response.json();
        console.log('Updated cart with address:', updatedCart);
        console.log('Updated cart delivery address:', updatedCart.deliveryAddress);
        dispatch({ type: 'SET_CART', payload: updatedCart });
        return updatedCart;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update delivery address');
      }
    } catch (error) {
      console.error('Failed to update delivery address:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update delivery address' });
      throw error;
    }
  };

  const checkout = async (paymentMethod, notes = '', specialInstructions = '') => {
    const uid = getCurrentUserUid();
    if (!uid) {
      throw new Error('User not found');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Get user auth token - check both client and vendor auth
      let token = null;
      
      // Try client token first
      const clientToken = localStorage.getItem('clientToken');
      if (clientToken) {
        token = clientToken;
      } else {
        // Try vendor token
        const vendorToken = sessionStorage.getItem('vendorToken');
        if (vendorToken) {
          token = vendorToken;
        }
      }

      if (!token) {
        throw new Error('Authentication required');
      }

      // Check if it's an online payment method
      const onlinePaymentMethods = ['card', 'mobile-banking', 'bank-transfer'];
      const isOnlinePayment = onlinePaymentMethods.includes(paymentMethod);

      let response;
      
      if (isOnlinePayment) {
        // Use SSLCommerz for online payments
        response = await fetch(`http://localhost:5005/api/payment/init`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paymentMethod, notes, specialInstructions })
        });
      } else {
        // Use regular checkout for COD
        response = await fetch(`http://localhost:5005/api/orders/checkout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paymentMethod, notes, specialInstructions })
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        if (isOnlinePayment && result.gateway_url) {
          // For online payments, redirect to SSLCommerz
          return {
            success: true,
            isOnlinePayment: true,
            gateway_url: result.gateway_url,
            redirect_url: result.redirect_url,
            sessionkey: result.sessionkey,
            orders: result.orders,
            totalAmount: result.totalAmount,
            tranId: result.tranId
          };
        } else {
          // For COD, clear cart and return success
          const emptyCart = { 
            items: [], 
            subtotal: 0, 
            total: 0, 
            itemCount: 0,
            deliveryAddress: null,
            deliveryMethod: null,
            deliveryFee: 0
          };
          dispatch({ type: 'SET_CART', payload: emptyCart });
          
          // Force refresh the cart from server to ensure we have the latest state
          setTimeout(async () => {
            try {
              const cartResponse = await fetch(`http://localhost:5005/api/cart/uid/${uid}`);
              if (cartResponse.ok) {
                const cartData = await cartResponse.json();
                dispatch({ type: 'SET_CART', payload: cartData });
              }
            } catch (error) {
              console.error('Failed to refresh cart after checkout:', error);
            }
          }, 100);
          
          return {
            success: true,
            isOnlinePayment: false,
            ...result
          };
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to checkout');
      }
    } catch (error) {
      console.error('Failed to checkout:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to checkout' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Get available delivery methods
  const getDeliveryMethods = async () => {
    const uid = getCurrentUserUid();
    if (!uid) {
      throw new Error('User not found');
    }

    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/delivery-methods`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delivery methods API error:', response.status, errorText);
        throw new Error(`Failed to get delivery methods: ${response.status} ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get delivery methods:', error);
      throw error;
    }
  };

  // Calculate delivery fee for a specific method
  const calculateDeliveryFee = async (deliveryMethod, negotiatedFee = 0) => {
    const uid = getCurrentUserUid();
    if (!uid) {
      throw new Error('User not found');
    }

    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/calculate-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deliveryMethod,
          negotiatedFee 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate delivery fee');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to calculate delivery fee:', error);
      throw error;
    }
  };

  // Update cart delivery details
  const updateDeliveryDetails = async (deliveryMethod, deliveryFee, deliveryNotes, negotiatedFee) => {
    const uid = getCurrentUserUid();
    if (!uid) {
      throw new Error('User not found');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`http://localhost:5005/api/cart/uid/${uid}/delivery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deliveryMethod,
          deliveryFee,
          deliveryNotes,
          negotiatedFee
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update delivery details');
      }

      const updatedCart = await response.json();
      dispatch({ type: 'SET_CART', payload: updatedCart });
      return updatedCart;
    } catch (error) {
      console.error('Failed to update delivery details:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update delivery details' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Calculate totals from cart data
  const cartTotal = cart.total || cart.subtotal || 0;
  const itemCount = cart.itemCount || (cart.items?.reduce((total, item) => total + item.quantity, 0) || 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        updateDeliveryAddress,
        updateDeliveryDetails,
        getDeliveryMethods,
        calculateDeliveryFee,
        checkout,
        cartTotal,
        itemCount,
        loading: cart.loading,
        error: cart.error
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
