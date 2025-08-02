import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import messagingService from '../../services/messagingService';

const GroupManagement = () => {
  const { user: vendor } = useVendorAuth();
  const [groups, setGroups] = useState([]);
  const [discoveredGroups, setDiscoveredGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('my-groups');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Create group form state
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    category: 'general',
    isPrivate: false,
    requiresApproval: false,
    maxMembers: 50,
    city: '',
    district: '',
    tags: []
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    district: ''
  });

  useEffect(() => {
    if (vendor?.uid) {
      loadGroups();
      loadDiscoveredGroups();
    }
  }, [vendor?.uid]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getGroups(vendor.uid);
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoveredGroups = async () => {
    try {
      const data = await messagingService.discoverGroups(
        searchTerm,
        filters.category,
        filters.city,
        filters.district
      );
      setDiscoveredGroups(data);
    } catch (error) {
      console.error('Error discovering groups:', error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    try {
      const groupData = {
        ...groupForm,
        creatorUid: vendor.uid,
        region: {
          city: groupForm.city,
          district: groupForm.district
        }
      };
      
      const newGroup = await messagingService.createGroup(groupData);
      
      setGroups(prev => [newGroup, ...prev]);
      setShowCreateGroup(false);
      setGroupForm({
        name: '',
        description: '',
        category: 'general',
        isPrivate: false,
        requiresApproval: false,
        maxMembers: 50,
        city: '',
        district: '',
        tags: []
      });
      
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await messagingService.joinGroup(groupId, vendor.uid);
      alert('Successfully joined group!');
      loadGroups();
      loadDiscoveredGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group. Please try again.');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }
    
    try {
      await messagingService.leaveGroup(groupId, vendor.uid);
      alert('Successfully left group!');
      loadGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group. Please try again.');
    }
  };

  const handleSearch = () => {
    loadDiscoveredGroups();
  };

  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'regional', label: 'Regional' },
    { value: 'category-based', label: 'Category Based' },
    { value: 'business', label: 'Business' }
  ];

  return (
    <div className="group-management" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#2d3436', marginBottom: '10px' }}>
          Vendor Groups
        </h1>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Connect with other vendors in your region or industry
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e9ecef' }}>
        <button
          onClick={() => setActiveTab('my-groups')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'my-groups' ? '#4CAF50' : 'transparent',
            color: activeTab === 'my-groups' ? 'white' : '#6c757d',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          My Groups ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'discover' ? '#4CAF50' : 'transparent',
            color: activeTab === 'discover' ? 'white' : '#6c757d',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Discover Groups
        </button>
      </div>

      {activeTab === 'my-groups' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: '#2d3436' }}>Your Groups</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + Create Group
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              Loading your groups...
            </div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
              <h3>No groups yet</h3>
              <p>Create or join groups to connect with other vendors</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {groups.map(group => (
                <div
                  key={group._id}
                  style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', color: '#2d3436' }}>{group.name}</h3>
                  <p style={{ color: '#6c757d', fontSize: '14px', margin: '0 0 15px 0' }}>
                    {group.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: '#e8f5e8',
                      color: '#4CAF50',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {group.category}
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      background: '#f8f9fa',
                      color: '#6c757d',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {group.stats.activeMembers} members
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleLeaveGroup(group._id)}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Leave
                    </button>
                    <button
                      onClick={() => window.location.href = '/messages'}
                      style={{
                        flex: 2,
                        padding: '8px 16px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Open Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: '#2d3436', marginBottom: '15px' }}>Discover Groups</h2>
            
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '10px',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px'
                }}
              />
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  padding: '10px',
                  border: '1px solid #e9ecef',
                  borderRadius: '6px'
                }}
              >
                <option value="">All Categories</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSearch}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Search
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {discoveredGroups.map(group => (
              <div
                key={group._id}
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <h3 style={{ margin: '0 0 10px 0', color: '#2d3436' }}>{group.name}</h3>
                <p style={{ color: '#6c757d', fontSize: '14px', margin: '0 0 15px 0' }}>
                  {group.description || 'No description'}
                </p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 8px',
                    background: '#e8f5e8',
                    color: '#4CAF50',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {group.category}
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    background: '#f8f9fa',
                    color: '#6c757d',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {group.stats.activeMembers} members
                  </span>
                  {group.settings.isPrivate && (
                    <span style={{
                      padding: '4px 8px',
                      background: '#fff3cd',
                      color: '#856404',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      Private
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleJoinGroup(group._id)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Join Group
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2d3436' }}>Create New Group</h2>
            
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px'
                  }}
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={groupForm.city}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, city: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    District
                  </label>
                  <input
                    type="text"
                    value={groupForm.district}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, district: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={groupForm.isPrivate}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  />
                  <span>Make this group private</span>
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e9ecef',
                    background: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
