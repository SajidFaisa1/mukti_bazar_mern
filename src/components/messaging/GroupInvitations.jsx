import React, { useState, useEffect } from 'react';
import messagingService from '../../services/messagingService';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './GroupInvitations.css';

const GroupInvitations = ({ onInvitationUpdate }) => {
  const { user } = useVendorAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getGroupInvitations(user.uid);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      await messagingService.acceptGroupInvitation(invitationId, user.uid);
      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
      // Notify parent component to refresh groups
      if (onInvitationUpdate) {
        onInvitationUpdate();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation: ' + error.message);
    }
  };

  const handleReject = async (invitationId) => {
    try {
      await messagingService.rejectGroupInvitation(invitationId, user.uid);
      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      alert('Failed to reject invitation: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="group-invitations">
        <h3>Group Invitations</h3>
        <div className="loading">Loading invitations...</div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="group-invitations">
        <h3>Group Invitations</h3>
        <div className="no-invitations">No pending invitations</div>
      </div>
    );
  }

  return (
    <div className="group-invitations">
      <h3>Group Invitations ({invitations.length})</h3>
      <div className="invitations-list">
        {invitations.map(invitation => (
          <div key={invitation._id} className="invitation-card">
            <div className="invitation-header">
              <div className="group-info">
                <h4>{invitation.group.name}</h4>
                <p className="group-category">{invitation.group.category}</p>
              </div>
              <div className="invitation-date">
                {formatDate(invitation.createdAt)}
              </div>
            </div>
            
            <div className="invitation-body">
              <p className="invitation-message">
                <strong>{invitation.inviter.businessName}</strong> invited you to join this group
              </p>
              {invitation.group.description && (
                <p className="group-description">{invitation.group.description}</p>
              )}
            </div>
            
            <div className="invitation-actions">
              <button 
                className="btn btn-accept"
                onClick={() => handleAccept(invitation._id)}
              >
                Accept
              </button>
              <button 
                className="btn btn-reject"
                onClick={() => handleReject(invitation._id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupInvitations;
