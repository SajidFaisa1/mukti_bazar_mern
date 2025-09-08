import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Eye, 
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';

const VendorAnalyticsSettings = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const periods = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 3 Months' },
    { value: '1year', label: 'Last Year' }
  ];

  // Mock data - in real app, this would come from API
  const analytics = {
    totalSales: 45280,
    totalOrders: 142,
    totalViews: 2847,
    conversionRate: 4.98,
    topProducts: [
      { name: 'Organic Rice', sales: 18, revenue: 8920 },
      { name: 'Fresh Vegetables Mix', sales: 24, revenue: 6750 },
      { name: 'Premium Wheat', sales: 15, revenue: 5680 },
      { name: 'Seasonal Fruits', sales: 19, revenue: 4230 }
    ],
    salesData: [
      { date: '2024-01-01', sales: 1250 },
      { date: '2024-01-02', sales: 1890 },
      { date: '2024-01-03', sales: 1560 },
      { date: '2024-01-04', sales: 2340 },
      { date: '2024-01-05', sales: 1980 },
      { date: '2024-01-06', sales: 2150 },
      { date: '2024-01-07', sales: 1870 }
    ]
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const handleExport = () => {
    // In real app, this would generate and download a CSV/PDF report
    alert('Export functionality would be implemented here');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600">Track your store performance and sales insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">+12.5%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">৳{analytics.totalSales.toLocaleString()}</h3>
          <p className="text-gray-600 text-sm">Total Sales</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">+8.2%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</h3>
          <p className="text-gray-600 text-sm">Total Orders</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-purple-600 font-medium">+15.3%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</h3>
          <p className="text-gray-600 text-sm">Store Views</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-sm text-orange-600 font-medium">+2.1%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analytics.conversionRate}%</h3>
          <p className="text-gray-600 text-sm">Conversion Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Sales Trend
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="mr-1 h-4 w-4" />
              {selectedPeriod}
            </div>
          </div>
          
          {/* Simple Bar Chart Representation */}
          <div className="space-y-3">
            {analytics.salesData.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-20">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(day.sales / Math.max(...analytics.salesData.map(d => d.sales))) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  ৳{day.sales}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Top Selling Products
          </h3>
          
          <div className="space-y-4">
            {analytics.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-700">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-500">{product.sales} sales</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">৳{product.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Performance Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-2">Strong Performance</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Sales increased by 12.5% this period</li>
              <li>• Conversion rate above average</li>
              <li>• High customer satisfaction ratings</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">Areas for Improvement</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Product views could be higher</li>
              <li>• Consider seasonal promotions</li>
              <li>• Update product descriptions</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Focus marketing on top products</li>
              <li>• Optimize pricing strategy</li>
              <li>• Expand successful categories</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Report Settings */}
      <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Filter className="mr-2 h-5 w-5" />
          Report Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Automated Reports</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" defaultChecked />
                <span className="text-sm text-gray-700">Weekly sales summary email</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" defaultChecked />
                <span className="text-sm text-gray-700">Monthly performance report</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span className="text-sm text-gray-700">Low stock alerts</span>
              </label>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Export Preferences</h4>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-700 mb-1 block">Default export format</span>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Excel (.xlsx)</option>
                  <option>CSV (.csv)</option>
                  <option>PDF Report</option>
                </select>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" defaultChecked />
                <span className="text-sm text-gray-700">Include charts in exports</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Save Report Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsSettings;
