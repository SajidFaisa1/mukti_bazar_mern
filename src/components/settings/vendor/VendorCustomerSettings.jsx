import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../../contexts/VendorAuthContext';
import { 
  Users, 
  Star, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag,
  Heart,
  AlertCircle,
  Store,
  UserCircle,
  RefreshCw
} from 'lucide-react';

const VendorCustomerSettings = () => {
  const { user, token } = useVendorAuth();
  const [customers, setCustomers] = useState([]);
  const [customerStats, setCustomerStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalUsers: 0,
    totalVendors: 0,
    averageOrderValue: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const fetchCustomers = async () => {
    if (!user || !token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/vendors/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      setCustomers(data.customers || []);
      setCustomerStats(data.stats || {});
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user, token]);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    const matchesType = filterType === 'all' || 
                       (filterType === 'users' && customer.customerType === 'user') ||
                       (filterType === 'vendors' && customer.customerType === 'vendor');
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerTypeIcon = (customerType) => {
    return customerType === 'vendor' ? 
      <Store className="h-4 w-4 text-blue-600" /> : 
      <UserCircle className="h-4 w-4 text-purple-600" />;
  };

  const getCustomerTypeColor = (customerType) => {
    return customerType === 'vendor' ? 
      'bg-blue-100 text-blue-800' : 
      'bg-purple-100 text-purple-800';
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString() : 'N/A';
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.district || ''}, ${address.division || ''}`.replace(/^,\s*|,\s*$/g, '') || 'N/A';
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Management</h2>
        <p className="text-gray-600">Manage your customers (both users and other vendors who buy from you)</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={fetchCustomers}
            className="ml-auto flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Customer Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">{customerStats.totalCustomers}</p>
              <p className="text-sm text-gray-600">Total Customers</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">{customerStats.activeCustomers}</p>
              <p className="text-sm text-gray-600">Active Customers</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <UserCircle className="h-6 w-6 text-purple-600" />
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">{customerStats.totalUsers}</p>
              <p className="text-sm text-gray-600">User Customers</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Store className="h-6 w-6 text-blue-600" />
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">{customerStats.totalVendors}</p>
              <p className="text-sm text-gray-600">Vendor Customers</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="h-6 w-6 text-orange-600" />
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">৳{Math.round(customerStats.averageOrderValue).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Avg Order Value</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Heart className="h-6 w-6 text-red-600" />
          </div>
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-900">৳{Math.round(customerStats.totalRevenue).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="users">Users</option>
            <option value="vendors">Vendors</option>
          </select>
          <button 
            onClick={fetchCustomers}
            disabled={loading}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {formatAddress(customer.address)}
                        </div>
                        <div className="text-xs text-gray-400">
                          First order: {formatDate(customer.firstOrderDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getCustomerTypeIcon(customer.customerType)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getCustomerTypeColor(customer.customerType)}`}>
                          {customer.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center mb-1">
                        <Mail className="h-3 w-3 mr-1" />
                        {customer.email || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {customer.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.totalOrders}</div>
                      <div className="text-xs text-gray-500">Last: {formatDate(customer.lastOrderDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ৳{Math.round(customer.totalSpent).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ৳{Math.round(customer.averageOrderValue).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(customer.status)}`}>
                        {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="text-green-600 hover:text-green-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          title="Send Message"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-900"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all' 
                ? 'No customers match your filters' 
                : 'No customers found. Start selling to build your customer base!'}
            </p>
          </div>
        )}
      </div>

      {/* Customer Insights */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2 mx-auto w-16"></div>
                <div className="h-4 bg-gray-200 rounded mx-auto w-24"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {customerStats.totalCustomers > 0 ? 
                  Math.round((customerStats.activeCustomers / customerStats.totalCustomers) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-600">Customer Retention Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {customerStats.totalCustomers > 0 ? 
                  (customers.reduce((sum, c) => sum + c.totalOrders, 0) / customerStats.totalCustomers).toFixed(1) : 0}
              </p>
              <p className="text-sm text-gray-600">Avg Orders per Customer</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                ৳{Math.round(customerStats.averageOrderValue).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Average Order Value</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {customerStats.totalVendors > 0 ? 
                  Math.round((customerStats.totalVendors / customerStats.totalCustomers) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-600">Vendor Customers</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorCustomerSettings;
