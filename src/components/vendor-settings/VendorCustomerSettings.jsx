import React, { useState } from 'react';
import { 
  Users, 
  Star, 
  MessageSquare, 
  TrendingUp, 
  Filter,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal
} from 'lucide-react';

const VendorCustomerSettings = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = [
    { value: 'all', label: 'All Customers' },
    { value: 'recent', label: 'Recent Orders' },
    { value: 'frequent', label: 'Frequent Buyers' },
    { value: 'high_value', label: 'High Value' },
    { value: 'reviews', label: 'Left Reviews' }
  ];

  // Mock customer data
  const customers = [
    {
      id: 1,
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      totalOrders: 12,
      totalSpent: 8500,
      lastOrderDate: '2024-01-15',
      rating: 4.8,
      reviewsLeft: 3,
      status: 'active'
    },
    {
      id: 2,
      name: 'Fatima Rahman',
      email: 'fatima@example.com',
      totalOrders: 8,
      totalSpent: 5200,
      lastOrderDate: '2024-01-12',
      rating: 4.5,
      reviewsLeft: 2,
      status: 'active'
    },
    {
      id: 3,
      name: 'Mohammad Ali',
      email: 'mohammad@example.com',
      totalOrders: 15,
      totalSpent: 12300,
      lastOrderDate: '2024-01-18',
      rating: 5.0,
      reviewsLeft: 5,
      status: 'active'
    },
    {
      id: 4,
      name: 'Rashida Begum',
      email: 'rashida@example.com',
      totalOrders: 6,
      totalSpent: 3800,
      lastOrderDate: '2024-01-10',
      rating: 4.2,
      reviewsLeft: 1,
      status: 'inactive'
    }
  ];

  // Mock reviews data
  const recentReviews = [
    {
      id: 1,
      customerName: 'Ahmed Hassan',
      productName: 'Organic Rice',
      rating: 5,
      comment: 'Excellent quality rice! Fresh and clean. Will definitely order again.',
      date: '2024-01-15',
      helpful: 12,
      response: null
    },
    {
      id: 2,
      customerName: 'Fatima Rahman',
      productName: 'Fresh Vegetables Mix',
      rating: 4,
      comment: 'Good quality vegetables, delivered fresh. Packaging could be better.',
      date: '2024-01-12',
      helpful: 8,
      response: 'Thank you for the feedback! We\'re working on improving our packaging.'
    },
    {
      id: 3,
      customerName: 'Mohammad Ali',
      productName: 'Premium Wheat',
      rating: 5,
      comment: 'Amazing quality wheat flour. Perfect for making traditional bread.',
      date: '2024-01-10',
      helpful: 15,
      response: null
    }
  ];

  const customerStats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.status === 'active').length,
    averageOrderValue: customers.reduce((sum, c) => sum + (c.totalSpent / c.totalOrders), 0) / customers.length,
    averageRating: customers.reduce((sum, c) => sum + c.rating, 0) / customers.length,
    totalReviews: customers.reduce((sum, c) => sum + c.reviewsLeft, 0)
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (selectedFilter) {
      case 'recent':
        return new Date(customer.lastOrderDate) > new Date('2024-01-14');
      case 'frequent':
        return customer.totalOrders >= 10;
      case 'high_value':
        return customer.totalSpent >= 8000;
      case 'reviews':
        return customer.reviewsLeft > 0;
      default:
        return true;
    }
  });

  const handleRespondToReview = (reviewId) => {
    // In real app, this would open a modal to respond to the review
    alert(`Respond to review ${reviewId}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Management</h2>
        <p className="text-gray-600">Manage your customers, reviews, and feedback</p>
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{customerStats.totalCustomers}</h3>
          <p className="text-gray-600 text-sm">Total Customers</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{customerStats.activeCustomers}</h3>
          <p className="text-gray-600 text-sm">Active Customers</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">৳{Math.round(customerStats.averageOrderValue)}</h3>
          <p className="text-gray-600 text-sm">Avg. Order Value</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{customerStats.averageRating.toFixed(1)}</h3>
          <p className="text-gray-600 text-sm">Avg. Rating</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="h-5 w-5 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{customerStats.totalReviews}</h3>
          <p className="text-gray-600 text-sm">Total Reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Customer List</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {filters.map(filter => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-medium text-sm">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">{customer.name}</h4>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">{customer.totalOrders} orders</span>
                        <span className="text-xs text-gray-500">৳{customer.totalSpent.toLocaleString()}</span>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 mr-1" />
                          <span className="text-xs text-gray-500">{customer.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      customer.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {recentReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{review.customerName}</h4>
                      <p className="text-sm text-gray-500">{review.productName}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 text-sm mb-3">{review.comment}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{new Date(review.date).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        <span>{review.helpful}</span>
                      </div>
                      <button className="flex items-center text-blue-600 hover:text-blue-800">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                    </div>
                  </div>
                  
                  {review.response ? (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800"><strong>Your Response:</strong></p>
                      <p className="text-sm text-blue-700 mt-1">{review.response}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRespondToReview(review.id)}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      Respond to Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Engagement Tools */}
      <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Engagement Tools</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Send Newsletter</h4>
            <p className="text-sm text-gray-600 mb-3">
              Send updates about new products and offers to your customers
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              Create Newsletter
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Review Requests</h4>
            <p className="text-sm text-gray-600 mb-3">
              Request reviews from customers who haven't left feedback
            </p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              Send Requests
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Loyalty Program</h4>
            <p className="text-sm text-gray-600 mb-3">
              Set up rewards for your frequent customers
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
              Setup Rewards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorCustomerSettings;
