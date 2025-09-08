import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  DollarSign,
  Package,
  Shield,
  Eye,
  Clock,
  MapPin,
  Zap
} from 'lucide-react';

const LiveActivityFeed = ({ token }) => {
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchLiveData = async () => {
    try {
      const [activitiesRes, alertsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5005/api/admin/monitoring/live-activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5005/api/admin/monitoring/live-alerts', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5005/api/admin/monitoring/live-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4 text-blue-500" />;
      case 'fraud': return <Shield className="w-4 h-4 text-red-500" />;
      case 'user': return <Users className="w-4 h-4 text-green-500" />;
      case 'vendor': return <DollarSign className="w-4 h-4 text-purple-500" />;
      case 'system': return <Activity className="w-4 h-4 text-gray-500" />;
      default: return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAlertSeverity = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
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
      {/* Live Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Live Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.liveOrders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Alerts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.activeAlerts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Online Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.onlineUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Risk Score</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.avgRiskScore || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
              <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No active alerts</p>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 border-l-4 ${getAlertSeverity(alert.severity)} ${
                    index !== alerts.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm mt-1">{alert.description}</p>
                      <div className="flex items-center mt-2 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        {alert.location && (
                          <>
                            <MapPin className="w-3 h-3 ml-3 mr-1" />
                            <span>{alert.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAlertSeverity(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Zap className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Live Activity</h3>
              <div className="ml-2 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="ml-1 text-xs text-green-600">Live</span>
              </div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div
                  key={index}
                  className={`p-4 flex items-start space-x-3 ${
                    index !== activities.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                      {activity.userId && (
                        <span className="ml-3">User: {activity.userId}</span>
                      )}
                    </div>
                  </div>
                  {activity.riskScore && (
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.riskScore > 75
                            ? 'bg-red-100 text-red-800'
                            : activity.riskScore > 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        Risk: {activity.riskScore}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveActivityFeed;
