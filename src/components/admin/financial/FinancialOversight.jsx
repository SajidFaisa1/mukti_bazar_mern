import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Eye,
  Filter,
  Download,
  Calendar,
  CreditCard,
  RefreshCw,
  Flag,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FinancialOversight = ({ token }) => {
  const [transactions, setTransactions] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [financialStats, setFinancialStats] = useState({});
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (token) {
      fetchFinancialData();
    }
  }, [token, selectedTimeframe]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, transactionsRes, suspiciousRes, chartRes] = await Promise.all([
        fetch(`/api/admin/financial/statistics?timeframe=${selectedTimeframe}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/financial/transactions?limit=50`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/financial/suspicious-activity', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/financial/charts?timeframe=${selectedTimeframe}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setFinancialStats(data.stats);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (suspiciousRes.ok) {
        const data = await suspiciousRes.json();
        setSuspiciousActivity(data.activities || []);
      }

      if (chartRes.ok) {
        const data = await chartRes.json();
        setChartData(data.chartData || []);
      }

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const flagTransaction = async (transactionId, reason) => {
    try {
      const response = await fetch(`/api/admin/financial/transactions/${transactionId}/flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchFinancialData(); // Refresh data
        alert('Transaction flagged successfully');
      }
    } catch (error) {
      console.error('Error flagging transaction:', error);
    }
  };

  const investigateTransaction = async (transactionId) => {
    try {
      const response = await fetch(`/api/admin/financial/transactions/${transactionId}/investigate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Investigation started');
        fetchFinancialData();
      }
    } catch (error) {
      console.error('Error starting investigation:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const pieChartColors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'];

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
          <h2 className="text-2xl font-bold text-gray-900">Financial Oversight</h2>
          <p className="text-gray-600 mt-1">Monitor transactions and detect financial irregularities</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={fetchFinancialData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Volume</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialStats.totalVolume || 0)}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{financialStats.volumeChange || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialStats.totalTransactions || 0}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">+{financialStats.transactionChange || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Suspicious Activity</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialStats.suspiciousCount || 0}
              </p>
              <div className="flex items-center mt-1">
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">{financialStats.suspiciousChange || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Flag className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Flagged Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {financialStats.flaggedCount || 0}
              </p>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-600">Pending Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'transactions', label: 'Transactions', icon: CreditCard },
              { id: 'suspicious', label: 'Suspicious Activity', icon: AlertTriangle },
              { id: 'analytics', label: 'Analytics', icon: BarChart }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Volume Chart */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Volume Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Risk Distribution */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Low Risk', value: financialStats.lowRisk || 0, color: '#10B981' },
                          { name: 'Medium Risk', value: financialStats.mediumRisk || 0, color: '#F59E0B' },
                          { name: 'High Risk', value: financialStats.highRisk || 0, color: '#EF4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Low Risk', value: financialStats.lowRisk || 0, color: '#10B981' },
                          { name: 'Medium Risk', value: financialStats.mediumRisk || 0, color: '#F59E0B' },
                          { name: 'High Risk', value: financialStats.highRisk || 0, color: '#EF4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
                <button className="flex items-center text-blue-600 hover:text-blue-700">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parties
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map(transaction => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {transaction.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>{transaction.buyerName}</div>
                            <div className="text-gray-500">→ {transaction.vendorName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(transaction.riskLevel)}`}>
                            {transaction.riskLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            transaction.status === 'flagged' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => investigateTransaction(transaction.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Investigate"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => flagTransaction(transaction.id, 'manual_review')}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Flag"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No transactions found</p>
                </div>
              )}
            </div>
          )}

          {/* Suspicious Activity Tab */}
          {activeTab === 'suspicious' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Suspicious Financial Activity</h3>
              
              <div className="space-y-4">
                {suspiciousActivity.map(activity => (
                  <div key={activity.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                        <div>
                          <h4 className="font-medium text-gray-900">{activity.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                            <span>Risk: <span className="font-medium text-red-600">{activity.riskLevel}</span></span>
                            <span>Amount: {formatCurrency(activity.amount)}</span>
                            <span>{new Date(activity.detectedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 text-sm">
                          Investigate
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-sm">
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {suspiciousActivity.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="text-gray-500">No suspicious activity detected</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Financial Analytics</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Transaction Count */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Daily Transaction Count</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Risk Trend */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Risk Level Trend</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="highRisk" stroke="#EF4444" name="High Risk" />
                      <Line type="monotone" dataKey="mediumRisk" stroke="#F59E0B" name="Medium Risk" />
                      <Line type="monotone" dataKey="lowRisk" stroke="#10B981" name="Low Risk" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialOversight;
