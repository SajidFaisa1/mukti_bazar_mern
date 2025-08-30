import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { user: vendorUser } = useVendorAuth();
  const { user: clientUser } = useClientAuth();
  const currentUser = vendorUser || clientUser;
  const currentRole = vendorUser ? 'vendor' : 'client';

  const [analytics, setAnalytics] = useState({
    summary: {
      totalNegotiations: 0,
      activeNegotiations: 0,
      successfulNegotiations: 0,
      successRate: 0,
      totalSavings: 0,
      averageDiscount: 0
    },
    trends: {
      monthlyData: [],
      categoryData: [],
      priceRangeData: []
    },
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y

  useEffect(() => {
    if (!currentUser) return;
    fetchAnalytics();
  }, [currentUser, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `http://localhost:5005/api/analytics/negotiations?uid=${currentUser.uid}&role=${currentRole}&timeRange=${timeRange}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="analytics-dashboard">
        <div className="no-auth-message">
          <h3>Please log in to view analytics</h3>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchAnalytics}>Try Again</button>
        </div>
      </div>
    );
  }

  const { summary, trends, recentActivity } = analytics;

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>📊 Negotiation Analytics</h2>
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>{summary.totalNegotiations}</h3>
            <p>Total Negotiations</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">⚡</div>
          <div className="card-content">
            <h3>{summary.activeNegotiations}</h3>
            <p>Currently Active</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>{summary.successfulNegotiations}</h3>
            <p>Successfully Closed</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>{summary.successRate.toFixed(1)}%</h3>
            <p>Success Rate</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <h3>৳{summary.totalSavings.toFixed(0)}</h3>
            <p>{currentRole === 'vendor' ? 'Total Revenue' : 'Total Savings'}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">🏷️</div>
          <div className="card-content">
            <h3>{summary.averageDiscount.toFixed(1)}%</h3>
            <p>Average {currentRole === 'vendor' ? 'Discount Given' : 'Discount Received'}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Monthly Negotiation Trends</h3>
          <div className="chart-placeholder">
            {trends.monthlyData.length > 0 ? (
              <div className="simple-bar-chart">
                {trends.monthlyData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div 
                      className="bar"
                      style={{ 
                        height: `${(item.count / Math.max(...trends.monthlyData.map(d => d.count))) * 100}%` 
                      }}
                    ></div>
                    <div className="bar-label">{item.month}</div>
                    <div className="bar-value">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No data available for the selected time range</p>
            )}
          </div>
        </div>

        <div className="chart-container">
          <h3>Performance by Category</h3>
          <div className="chart-placeholder">
            {trends.categoryData.length > 0 ? (
              <div className="category-list">
                {trends.categoryData.map((item, index) => (
                  <div key={index} className="category-item">
                    <div className="category-name">{item.category}</div>
                    <div className="category-stats">
                      <span className="category-count">{item.count} negotiations</span>
                      <span className="category-rate">{item.successRate.toFixed(1)}% success</span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className="category-progress"
                        style={{ width: `${item.successRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No category data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Price Range Analysis */}
      <div className="price-analysis">
        <h3>Price Range Analysis</h3>
        <div className="price-ranges">
          {trends.priceRangeData.map((range, index) => (
            <div key={index} className="price-range-card">
              <div className="price-range-label">
                ৳{range.min} - ৳{range.max}
              </div>
              <div className="price-range-stats">
                <div className="stat">
                  <span className="stat-value">{range.count}</span>
                  <span className="stat-label">Negotiations</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{range.successRate.toFixed(1)}%</span>
                  <span className="stat-label">Success Rate</span>
                </div>
                <div className="stat">
                  <span className="stat-value">৳{range.avgSavings.toFixed(0)}</span>
                  <span className="stat-label">Avg {currentRole === 'vendor' ? 'Revenue' : 'Savings'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Recent Negotiation Activity</h3>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'started' && '🚀'}
                  {activity.type === 'accepted' && '✅'}
                  {activity.type === 'rejected' && '❌'}
                  {activity.type === 'counter_offer' && '🔄'}
                  {activity.type === 'expired' && '⏰'}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-time">{activity.timeAgo}</div>
                </div>
                <div className="activity-amount">
                  {activity.amount && `৳${activity.amount}`}
                </div>
              </div>
            ))
          ) : (
            <p>No recent activity</p>
          )}
        </div>
      </div>

      {/* Tips and Insights */}
      <div className="insights-section">
        <h3>💡 Insights & Tips</h3>
        <div className="insights-grid">
          {currentRole === 'vendor' ? (
            <>
              <div className="insight-card">
                <h4>Optimize Your Pricing</h4>
                <p>Your average discount is {summary.averageDiscount.toFixed(1)}%. Consider adjusting your initial prices to maximize profit while staying competitive.</p>
              </div>
              <div className="insight-card">
                <h4>Response Time Matters</h4>
                <p>Quick responses to negotiations typically lead to higher success rates. Try to respond within 24 hours.</p>
              </div>
              <div className="insight-card">
                <h4>Seasonal Trends</h4>
                <p>Track your busiest months to plan inventory and pricing strategies accordingly.</p>
              </div>
            </>
          ) : (
            <>
              <div className="insight-card">
                <h4>Negotiation Strategy</h4>
                <p>Your success rate is {summary.successRate.toFixed(1)}%. Consider starting with reasonable offers to improve acceptance rates.</p>
              </div>
              <div className="insight-card">
                <h4>Best Times to Negotiate</h4>
                <p>Vendors are often more flexible during off-peak hours and end of month periods.</p>
              </div>
              <div className="insight-card">
                <h4>Build Relationships</h4>
                <p>Repeat negotiations with trusted vendors often yield better deals and faster responses.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
