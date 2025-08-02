import React, { useState } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import messagingService from '../../services/messagingService';

const ContactVendorButton = ({ product, vendor, className = '' }) => {
  const { user: currentVendor } = useVendorAuth();
  const { user: currentUser } = useClientAuth();
  const [loading, setLoading] = useState(false);
  
  const currentRole = currentVendor ? 'vendor' : 'client';
  const currentUserData = currentVendor || currentUser;
  
  // Don't show button if no vendor info or no current user
  if (!vendor || !currentUserData) {
    return null;
  }
  
  const handleContactVendor = async () => {
    if (!currentUserData) {
      alert('Please log in to contact the vendor');
      return;
    }
    
    if (currentVendor && currentVendor.uid === vendor.uid) {
      alert('You cannot message yourself');
      return;
    }
    
    try {
      setLoading(true);
      
      const participant1 = {
        uid: currentUserData.uid,
        role: currentRole
      };
      
      const participant2 = {
        uid: vendor.uid,
        role: 'vendor'
      };
      
      const initialMessage = {
        content: `Hi! I'm interested in your product: ${product.name}. ${product.offerPrice ? `Price: ৳${product.offerPrice}` : `Price: ৳${product.unitPrice}`}`,
        messageType: 'text',
        productContext: {
          productId: product._id || product.id,
          productName: product.name,
          productImage: product.images?.[0] || null,
          productPrice: product.offerPrice || product.unitPrice,
          vendorStoreId: product.storeId || vendor.storeId
        }
      };
      
      const conversation = await messagingService.createConversation(
        participant1,
        participant2,
        product._id,
        initialMessage
      );
      
      // Redirect to messages page
      window.location.href = '/messages';
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleContactVendor}
      disabled={loading}
      className={`contact-vendor-btn ${className}`}
      style={{
        padding: '10px 20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? 'Starting...' : '💬 Contact Vendor'}
    </button>
  );
};

export default ContactVendorButton;
