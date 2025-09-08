import React, { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';

const InventoryOverview = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [controls, setControls] = useState({});
  const [filters, setFilters] = useState({
    category: 'all',
    riskLevel: 'all',
    timeRange: '7d'
  });

  useEffect(() => {
    if (token) {
      fetchInventoryData();
    }
  }, [token, filters]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters);
      const response = await fetch(`http://localhost:5005/api/admin/inventory/overview?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInventoryData(data.inventory || {});
        setAlerts(data.alerts || []);
        setControls(data.controls || {});
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePriceControl = async (productId, controlType, value) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/inventory/price-control`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          controlType,
          value,
          reason: 'Admin intervention'
        })
      });

      if (response.ok) {
        fetchInventoryData();
      }
    } catch (error) {
      console.error('Error updating price control:', error);
    }
  };

  const emergencyStockAllocation = async (productId, allocation) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/inventory/emergency-allocation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          allocation,
          reason: 'Emergency market intervention'
        })
      });

      if (response.ok) {
        fetchInventoryData();
      }
    } catch (error) {
      console.error('Error updating stock allocation:', error);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory & Market Control</h2>
          <p className="text-gray-600 mt-1">Monitor and control market dynamics and inventory</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
            <option value="grains">Grains</option>
            <option value="spices">Spices</option>
          </select>
          
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <button
            onClick={fetchInventoryData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{inventoryData.totalProducts || 0}</p>
              <p className="text-sm text-gray-600 mt-1">{inventoryData.activeProducts || 0} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Market Value</p>
              <p className="text-2xl font-semibold text-gray-900">৳{inventoryData.totalValue || 0}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{inventoryData.valueGrowth || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Price Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">{alerts.length}</p>
              <p className="text-sm text-red-600 mt-1">
                {alerts.filter(a => a.severity === 'critical').length} critical
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Settings className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Controls</p>
              <p className="text-2xl font-semibold text-gray-900">{Object.keys(controls).length}</p>
              <p className="text-sm text-purple-600 mt-1">Market interventions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Price Manipulation Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts.map((alert, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <AlertTriangle className={`w-5 h-5 mr-2 ${
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'high' ? 'text-orange-500' :
                        'text-yellow-500'
                      }`} />
                      <h4 className="text-lg font-medium text-gray-900">{alert.product}</h4>
                      <span className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full border ${getRiskColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{alert.description}</p>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Price:</span>
                        <span className="ml-2 font-medium">৳{alert.currentPrice}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Market Average:</span>
                        <span className="ml-2 font-medium">৳{alert.marketAverage}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Deviation:</span>
                        <span className={`ml-2 font-medium ${alert.deviation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {alert.deviation > 0 ? '+' : ''}{alert.deviation}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex space-x-2">
                    <button
                      onClick={() => updatePriceControl(alert.productId, 'ceiling', alert.marketAverage * 1.1)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Set Price Ceiling
                    </button>
                    <button
                      onClick={() => updatePriceControl(alert.productId, 'floor', alert.marketAverage * 0.9)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                      Set Price Floor
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Overview Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Product Inventory Overview</h3>
            <button className="flex items-center text-blue-600 hover:text-blue-800">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Controls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryData.products?.map((product, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-full object-cover" 
                          src={product.image || '/placeholder-product.jpg'} 
                          alt={product.name} 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.stock} units</div>
                    <div className={`text-sm ${
                      product.stockLevel === 'low' ? 'text-red-600' :
                      product.stockLevel === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {product.stockLevel} stock
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ৳{product.currentPrice}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.priceChange > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        product.priceChange > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.priceChange > 0 ? '+' : ''}{product.priceChange}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskColor(product.riskLevel)}`}>
                      {product.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {product.priceControl && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          <Lock className="w-3 h-3 mr-1" />
                          Price Lock
                        </span>
                      )}
                      {product.stockControl && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                          <Settings className="w-3 h-3 mr-1" />
                          Stock Control
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updatePriceControl(product.id, 'toggle', !product.priceControl)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {product.priceControl ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => emergencyStockAllocation(product.id, { limit: 10 })}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryOverview;
