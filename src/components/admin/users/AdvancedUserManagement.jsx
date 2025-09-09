import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Shield,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Link,
  Activity,
  Calendar,
  Mail,
  Phone,
  X
} from 'lucide-react';

const AdvancedUserManagement = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    riskLevel: 'all',
    verificationStatus: 'all',
    accountAge: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [userBehaviorData, setUserBehaviorData] = useState({});
  const [showLinkedAccountsModal, setShowLinkedAccountsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchLinkedAccounts();
      fetchUserBehaviorData();
    }
  }, [token, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      // Only add non-default filter values
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.riskLevel !== 'all') queryParams.append('riskLevel', filters.riskLevel);
      if (filters.verificationStatus !== 'all') queryParams.append('verificationStatus', filters.verificationStatus);
      if (filters.accountAge !== 'all') queryParams.append('accountAge', filters.accountAge);
      queryParams.append('limit', '100');

      const response = await fetch(`http://localhost:5005/api/admin/users/advanced?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure users is an array and has proper structure
        const usersData = Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : [];
        
        // Normalize user data structure
        const normalizedUsers = usersData.map(user => ({
          id: user._id || user.id,
          firstName: user.firstName || user.name?.split(' ')[0] || 'Unknown',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || '',
          status: user.status || 'pending',
          riskLevel: user.riskLevel || 'low',
          verification: user.verification || { status: 'unverified' },
          lastLoginAt: user.lastLoginAt || user.lastLogin,
          createdAt: user.createdAt || user.joinDate || new Date().toISOString(),
          role: user.role || 'user'
        }));
        
        setUsers(normalizedUsers);
      } else {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedAccounts = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/users/linked-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLinkedAccounts(data.linkedAccounts || []);
      } else {
        // If endpoint doesn't exist, set empty array
        setLinkedAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching linked accounts:', error);
      setLinkedAccounts([]);
    }
  };

  const fetchUserBehaviorData = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/users/behavior-analysis', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserBehaviorData(data.behaviorData || {});
      } else {
        setUserBehaviorData({});
      }
    } catch (error) {
      console.error('Error fetching behavior data:', error);
      setUserBehaviorData({});
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    try {
      const response = await fetch('http://localhost:5005/api/admin/users/bulk-action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: bulkAction,
          userIds: selectedUsers
        })
      });

      if (response.ok) {
        setShowBulkModal(false);
        setSelectedUsers([]);
        setBulkAction('');
        fetchUsers();
        alert('Bulk action completed successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to perform bulk action: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action');
    }
  };

  const banUser = async (userId, reason) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchUsers();
        alert('User banned successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to ban user: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
    }
  };

  const unbanUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers();
        alert('User unbanned successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to unban user: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Failed to unban user');
    }
  };

  const investigateUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/users/${userId}/investigate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Investigation started');
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Failed to start investigation: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting investigation:', error);
      alert('Failed to start investigation');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  const exportUsers = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/users/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id),
          filters,
          searchTerm
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Users exported successfully');
      } else {
        // Fallback: generate CSV on frontend if backend endpoint doesn't exist
        const csvData = generateCSV(selectedUsers.length > 0 ? 
          users.filter(u => selectedUsers.includes(u.id)) : users);
        downloadCSV(csvData, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        alert('Users exported successfully (client-side)');
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      // Fallback: generate CSV on frontend
      const csvData = generateCSV(selectedUsers.length > 0 ? 
        users.filter(u => selectedUsers.includes(u.id)) : users);
      downloadCSV(csvData, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      alert('Users exported successfully (fallback)');
    }
  };

  const generateCSV = (usersData) => {
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Risk Level', 'Verification', 'Joined', 'Last Login'];
    const rows = usersData.map(user => [
      user.id,
      user.firstName || '',
      user.lastName || '',
      user.email || '',
      user.phone || '',
      user.status || '',
      user.riskLevel || '',
      user.verification?.status || 'unverified',
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
      user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch('http://localhost:5005/api/admin/users/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setShowImportModal(false);
        setImportFile(null);
        fetchUsers();
        alert(`Import completed: ${result.imported} users imported, ${result.errors} errors`);
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing users:', error);
      alert('Failed to import users. Feature may not be implemented yet.');
    }
  };

  const viewLinkedAccounts = () => {
    setShowLinkedAccountsModal(true);
  };

  const linkAccounts = async (accountIds) => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/users/link-accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountIds })
      });

      if (response.ok) {
        alert('Accounts linked successfully');
        fetchLinkedAccounts();
      } else {
        const errorData = await response.json();
        alert(`Failed to link accounts: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error linking accounts:', error);
      alert('Failed to link accounts. Feature may not be implemented yet.');
    }
  };

  const unlinkAccounts = async (linkId) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/users/unlink-accounts/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Accounts unlinked successfully');
        fetchLinkedAccounts();
      } else {
        const errorData = await response.json();
        alert(`Failed to unlink accounts: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error unlinking accounts:', error);
      alert('Failed to unlink accounts. Feature may not be implemented yet.');
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'banned': return 'text-red-600';
      case 'suspended': return 'text-yellow-600';
      case 'pending': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced User Management</h2>
          <p className="text-gray-600 mt-1">Comprehensive user oversight and bulk operations</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button 
            onClick={exportUsers}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Users
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <UserCheck className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <UserX className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Banned Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.status === 'banned').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">High Risk</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.riskLevel === 'high').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>

            <select
              value={filters.verificationStatus}
              onChange={(e) => setFilters({...filters, verificationStatus: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{selectedUsers.length} selected</span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Action</option>
                <option value="ban">Ban Users</option>
                <option value="unban">Unban Users</option>
                <option value="verify">Verify Users</option>
                <option value="flag">Flag for Review</option>
                <option value="export">Export Selected</option>
              </select>
              <button
                onClick={() => setShowBulkModal(true)}
                disabled={!bulkAction}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
              >
                Execute
              </button>
              <button
                onClick={clearSelection}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Linked Accounts Alert */}
      {linkedAccounts && linkedAccounts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <Link className="w-5 h-5 text-orange-500 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-orange-900">Potential Linked Accounts Detected</h4>
              <p className="text-sm text-orange-800 mt-1">
                {linkedAccounts.length} groups of potentially linked accounts found. 
                <button 
                  onClick={viewLinkedAccounts}
                  className="ml-2 text-orange-900 underline hover:no-underline font-medium"
                >
                  Review Now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Users ({filteredUsers.length})</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllUsers}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={() => selectedUsers.length === filteredUsers.length ? clearSelection() : selectAllUsers()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {user.phone}
                          </div>
                        )}
                        {user.role && (
                          <div className="text-xs text-gray-400">
                            Role: {user.role}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'banned' ? 'bg-red-100 text-red-800' :
                      user.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {user.status === 'banned' && <XCircle className="w-3 h-3 mr-1" />}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadgeColor(user.riskLevel)}`}>
                      {user.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      user.verification?.status === 'verified' ? 'bg-green-100 text-green-800' :
                      user.verification?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.verification?.status === 'verified' && <Shield className="w-3 h-3 mr-1" />}
                      {user.verification?.status || 'unverified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 mr-1" />
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => investigateUser(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Investigate User"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => banUser(user.id, 'Manual admin action')}
                          className="text-red-600 hover:text-red-900"
                          title="Ban User"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : user.status === 'banned' ? (
                        <button
                          onClick={() => unbanUser(user.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Unban User"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : null}
                      <button
                        className="text-gray-600 hover:text-gray-900"
                        title="Send Message"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Bulk Action Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Bulk Action</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to {bulkAction} {selectedUsers.length} selected users?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Import Users</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="text-xs text-gray-500">
                <p>CSV should contain columns: firstName, lastName, email, phone, role</p>
                <p>Maximum 1000 users per import</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linked Accounts Modal */}
      {showLinkedAccountsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Linked Accounts Review</h3>
              <button
                onClick={() => setShowLinkedAccountsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {linkedAccounts && linkedAccounts.length > 0 ? linkedAccounts.map((group, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Link Group {index + 1}</h4>
                      <p className="text-sm text-gray-600">
                        Similarity Score: {group.similarityScore || 'N/A'}% | 
                        Reason: {group.linkReason || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => linkAccounts(group.accounts?.map(a => a.id) || [])}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200"
                      >
                        Confirm Link
                      </button>
                      {group.isLinked && (
                        <button
                          onClick={() => unlinkAccounts(group.linkId)}
                          className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200"
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.accounts && group.accounts.map((account, accountIndex) => (
                      <div key={accountIndex} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{account.name || 'Unknown User'}</p>
                            <p className="text-xs text-gray-600">{account.email || 'No email'}</p>
                            <p className="text-xs text-gray-600">{account.phone || 'No phone'}</p>
                            <p className="text-xs text-gray-500">
                              IP: {account.lastIP || 'Unknown'} | Created: {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            account.status === 'active' ? 'bg-green-100 text-green-700' :
                            account.status === 'banned' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {account.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    <p><strong>Shared Indicators:</strong> {group.sharedIndicators?.join(', ') || 'None'}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Link className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No linked accounts detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedUserManagement;
