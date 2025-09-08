import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Crown, 
  UserPlus, 
  UserMinus,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Clock,
  Activity
} from 'lucide-react';

const AdminManagement = ({ token }) => {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminRoles, setAdminRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [permissions, setPermissions] = useState([]);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newAdminCredentials, setNewAdminCredentials] = useState(null);
  const [showArchivedAdmins, setShowArchivedAdmins] = useState(false);
  const [archivedAdmins, setArchivedAdmins] = useState([]);

  // Predefined admin roles and permissions
  const ADMIN_ROLES = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full system access including admin management',
      permissions: ['all']
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Standard admin access without admin management',
      permissions: ['vendor_management', 'product_management', 'fraud_detection', 'user_management', 'analytics_access']
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'Limited admin access for content and user moderation',
      permissions: ['user_management', 'product_management', 'fraud_detection']
    },
    {
      id: 'analyst',
      name: 'Analyst',
      description: 'Read-only access to analytics and reports',
      permissions: ['analytics_access', 'audit_logs']
    }
  ];

  const PERMISSIONS = [
    { id: 'user_management', name: 'User Management', description: 'Manage user accounts, ban/unban users' },
    { id: 'vendor_management', name: 'Vendor Management', description: 'Approve/reject vendor applications' },
    { id: 'product_management', name: 'Product Management', description: 'Approve/reject product listings' },
    { id: 'fraud_detection', name: 'Fraud Detection', description: 'Access fraud detection and intervention tools' },
    { id: 'financial_oversight', name: 'Financial Oversight', description: 'Access financial reports and controls' },
    { id: 'system_configuration', name: 'System Configuration', description: 'Configure system-wide settings' },
    { id: 'analytics_access', name: 'Analytics Access', description: 'Access to market analytics and reports' },
    { id: 'audit_logs', name: 'Audit Logs', description: 'View system audit logs and activity' },
    { id: 'admin_management', name: 'Admin Management', description: 'Promote/demote admins (Super Admin only)' },
    { id: 'bulk_operations', name: 'Bulk Operations', description: 'Perform bulk data operations' }
  ];

  useEffect(() => {
    if (token) {
      fetchAdminsAndUsers();
    }
  }, [token]);

  const fetchAdminsAndUsers = async () => {
    try {
      setLoading(true);
      const [adminsRes, usersRes, archivedRes] = await Promise.all([
        fetch('http://localhost:5005/api/admin/management/admins', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5005/api/admin/management/eligible-users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5005/api/admin/management/admins/archived', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (archivedRes.ok) {
        const archivedData = await archivedRes.json();
        setArchivedAdmins(archivedData.archivedAdmins || []);
      }

    } catch (error) {
      console.error('Error fetching admins and users:', error);
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const roleData = ADMIN_ROLES.find(r => r.id === selectedRole);
      const response = await fetch('http://localhost:5005/api/admin/management/promote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          role: selectedRole,
          permissions: roleData.permissions
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store the credentials for display
        setNewAdminCredentials({
          email: data.admin.email,
          tempPassword: data.admin.tempPassword,
          role: data.admin.role,
          userName: `${selectedUser.firstName} ${selectedUser.lastName}`
        });
        
        setShowPromoteModal(false);
        setSelectedUser(null);
        setSelectedRole('admin');
        setShowCredentialsModal(true);
        fetchAdminsAndUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('Failed to promote user');
    }
  };

  const demoteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to remove admin privileges from this user?')) return;

    try {
      const response = await fetch(`http://localhost:5005/api/admin/management/demote/${adminId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAdminsAndUsers();
        alert('Admin privileges removed successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error demoting admin:', error);
      alert('Failed to remove admin privileges');
    }
  };

  const unarchiveAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to restore admin privileges for this user?')) return;

    try {
      const response = await fetch(`http://localhost:5005/api/admin/management/unarchive/${adminId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchAdminsAndUsers();
        alert('Admin privileges restored successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error restoring admin:', error);
      alert('Failed to restore admin privileges');
    }
  };

  const toggleAdminStatus = async (adminId, enabled) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/management/toggle/${adminId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        fetchAdminsAndUsers();
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderator': return 'bg-green-100 text-green-800 border-green-200';
      case 'analyst': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin': return <Crown className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'moderator': return <Users className="w-4 h-4" />;
      case 'analyst': return <Activity className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const filteredUsers = users.filter(user =>
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600 mt-1">Manage admin users and their permissions</p>
        </div>
        <button
          onClick={() => setShowPromoteModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Promote User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Super Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {admins.filter(a => a.role === 'super_admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {admins.filter(a => a.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Moderators</p>
              <p className="text-2xl font-semibold text-gray-900">
                {admins.filter(a => a.role === 'moderator').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Analysts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {admins.filter(a => a.role === 'analyst').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Admins */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current Admins</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Users className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {admin.name || admin.email}
                        </div>
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(admin.role)}`}>
                      {getRoleIcon(admin.role)}
                      <span className="ml-1">{ADMIN_ROLES.find(r => r.id === admin.role)?.name || admin.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {admin.permissions?.slice(0, 3).map((permission) => (
                        <span key={permission} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {PERMISSIONS.find(p => p.id === permission)?.name || permission}
                        </span>
                      ))}
                      {admin.permissions?.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          +{admin.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      admin.enabled !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {admin.enabled !== false ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleAdminStatus(admin._id, admin.enabled === false)}
                        className={`p-2 rounded ${
                          admin.enabled !== false 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        title={admin.enabled !== false ? 'Disable Admin' : 'Enable Admin'}
                      >
                        {admin.enabled !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      
                      {admin.role !== 'super_admin' && (
                        <button
                          onClick={() => demoteAdmin(admin._id)}
                          className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          title="Remove Admin Privileges"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived Admins Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Archived Admins</h3>
            <button
              onClick={() => setShowArchivedAdmins(!showArchivedAdmins)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showArchivedAdmins ? 'Hide' : 'Show'} Archived ({archivedAdmins.length})
            </button>
          </div>

          {showArchivedAdmins && (
            <div className="overflow-hidden">
              {archivedAdmins.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No archived admins</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archivedAdmins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <Users className="h-6 w-6 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {admin.name || admin.email}
                              </div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {ADMIN_ROLES.find(r => r.id === admin.role)?.name || admin.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {admin.archivedAt ? new Date(admin.archivedAt).toLocaleDateString() : 'N/A'}
                          </div>
                          {admin.archivedBy && (
                            <div className="text-xs text-gray-400">
                              by {admin.archivedBy.name || admin.archivedBy.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => unarchiveAdmin(admin._id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Promote User Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Promote User to Admin</h3>
              
              {/* User Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search and Select User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                        selectedUser?._id === user._id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.verified && (
                        <span className="inline-flex items-center mt-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions Preview */}
              {selectedRole && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="font-medium text-gray-900 mb-2">Permissions for this role:</h4>
                  <div className="flex flex-wrap gap-2">
                    {ADMIN_ROLES.find(r => r.id === selectedRole)?.permissions.map((permission) => (
                      <span key={permission} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {permission === 'all' ? 'All Permissions' : PERMISSIONS.find(p => p.id === permission)?.name || permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Admin privileges grant significant system access. Only promote trusted users.
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedUser(null);
                    setSelectedRole('admin');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={promoteToAdmin}
                  disabled={!selectedUser}
                  className={`px-4 py-2 rounded-md ${
                    selectedUser 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Promote to Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && newAdminCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                Admin Account Created Successfully!
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{newAdminCredentials.userName}</strong> has been promoted to <strong>{newAdminCredentials.role}</strong>.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-3">Login Credentials:</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Email:</label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-white px-2 py-1 rounded border text-sm flex-1">
                          {newAdminCredentials.email}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(newAdminCredentials.email)}
                          className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Temporary Password:</label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-white px-2 py-1 rounded border text-sm flex-1 font-mono">
                          {newAdminCredentials.tempPassword}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(newAdminCredentials.tempPassword)}
                          className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex">
                      <svg className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      <div>
                        <p className="text-xs text-yellow-800">
                          <strong>Important:</strong> Please share these credentials securely with the new admin. 
                          They will be required to change their password on first login.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Admin login URL: <code className="text-xs bg-gray-100 px-1 rounded">/admin/login</code></span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    const credentials = `Admin Login Credentials:\nEmail: ${newAdminCredentials.email}\nPassword: ${newAdminCredentials.tempPassword}\nLogin URL: ${window.location.origin}/admin/login`;
                    navigator.clipboard.writeText(credentials);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Copy All Details
                </button>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setNewAdminCredentials(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
