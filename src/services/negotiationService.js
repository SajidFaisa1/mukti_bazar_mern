const API_BASE_URL = 'http://localhost:5005/api';

class NegotiationService {
  // Start a new negotiation
  async startNegotiation(negotiationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(negotiationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start negotiation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting negotiation:', error);
      throw error;
    }
  }

  // Get negotiations for a user
  async getNegotiations(uid, role, status = 'all') {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations?uid=${uid}&role=${role}&status=${status}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch negotiations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching negotiations:', error);
      throw error;
    }
  }

  // Get negotiations for a specific conversation
  async getConversationNegotiations(conversationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations/conversation/${conversationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation negotiations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation negotiations:', error);
      throw error;
    }
  }

  // Get specific negotiation
  async getNegotiation(negotiationId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations/${negotiationId}?uid=${uid}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch negotiation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching negotiation:', error);
      throw error;
    }
  }

  // Make a counter offer
  async makeCounterOffer(negotiationId, offerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations/${negotiationId}/counter-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make counter offer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error making counter offer:', error);
      throw error;
    }
  }

  // Accept an offer
  async acceptOffer(negotiationId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations/${negotiationId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept offer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  }

  // Reject an offer
  async rejectOffer(negotiationId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations/${negotiationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject offer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error rejecting offer:', error);
      throw error;
    }
  }

  // Cancel negotiation
  async cancelNegotiation(negotiationId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/negotiations/${negotiationId}?uid=${uid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel negotiation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling negotiation:', error);
      throw error;
    }
  }

  // Utility methods
  formatPrice(price) {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price).replace('BDT', '৳');
  }

  calculateSavings(originalPrice, negotiatedPrice) {
    const savings = originalPrice - negotiatedPrice;
    const percentage = ((savings / originalPrice) * 100).toFixed(1);
    return {
      amount: savings,
      percentage: percentage,
      isDiscount: savings > 0
    };
  }

  getStatusColor(status) {
    const statusColors = {
      active: '#2196F3',     // Blue
      accepted: '#4CAF50',   // Green
      rejected: '#F44336',   // Red
      expired: '#FF9800',    // Orange
      cancelled: '#9E9E9E'   // Gray
    };
    return statusColors[status] || '#757575';
  }

  getStatusText(status) {
    const statusTexts = {
      active: 'Active',
      accepted: 'Accepted',
      rejected: 'Rejected',
      expired: 'Expired',
      cancelled: 'Cancelled'
    };
    return statusTexts[status] || 'Unknown';
  }

  formatTimeRemaining(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  }

  isNearExpiry(expiresAt, hoursThreshold = 24) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    const hoursLeft = diff / (1000 * 60 * 60);
    
    return hoursLeft <= hoursThreshold && hoursLeft > 0;
  }

  getParticipantInfo(negotiation, currentUserUid) {
    const isBuyer = negotiation.buyerUid === currentUserUid;
    
    if (isBuyer) {
      return {
        role: 'buyer',
        otherParticipant: {
          uid: negotiation.sellerUid,
          name: negotiation.seller?.businessName || 'Seller',
          role: 'seller'
        }
      };
    } else {
      return {
        role: 'seller',
        otherParticipant: {
          uid: negotiation.buyerUid,
          name: negotiation.buyerRole === 'vendor' 
            ? negotiation.buyer?.businessName 
            : negotiation.buyer?.name || 'Buyer',
          role: 'buyer'
        }
      };
    }
  }

  getLastOffer(negotiation) {
    if (!negotiation.offers || negotiation.offers.length === 0) {
      return null;
    }
    return negotiation.offers[negotiation.offers.length - 1];
  }

  canMakeCounterOffer(negotiation, currentUserUid) {
    if (negotiation.status !== 'active') return false;
    if (new Date(negotiation.expiresAt) <= new Date()) return false;
    
    const lastOffer = this.getLastOffer(negotiation);
    if (!lastOffer) return true;
    
    // Can make counter offer if the last offer was not made by current user
    return lastOffer.fromUid !== currentUserUid;
  }

  canAcceptOffer(negotiation, currentUserUid) {
    if (negotiation.status !== 'active') return false;
    if (new Date(negotiation.expiresAt) <= new Date()) return false;
    
    const lastOffer = this.getLastOffer(negotiation);
    if (!lastOffer) return false;
    
    // Can accept offer if the last offer was not made by current user
    return lastOffer.fromUid !== currentUserUid;
  }

  canRejectOffer(negotiation, currentUserUid) {
    return this.canAcceptOffer(negotiation, currentUserUid);
  }
}

// Create and export singleton instance
const negotiationService = new NegotiationService();
export default negotiationService;
