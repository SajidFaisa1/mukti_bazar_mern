import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Pause, 
  AlertTriangle, 
  Shield, 
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Ban,
  Eye,
  ArrowRight
} from 'lucide-react';

const AutomatedRules = ({ token }) => {
  const [rules, setRules] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    triggers: [],
    conditions: [],
    actions: [],
    enabled: true,
    priority: 'medium'
  });

  useEffect(() => {
    if (token) {
      fetchRulesAndResponses();
    }
  }, [token]);

  const fetchRulesAndResponses = async () => {
    try {
      setLoading(true);
      const [rulesRes, responsesRes] = await Promise.all([
        fetch('http://localhost:5005/api/admin/responses/rules', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5005/api/admin/responses/automated-responses', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
      }

      if (responsesRes.ok) {
        const responsesData = await responsesRes.json();
        setResponses(responsesData.responses || []);
      }
    } catch (error) {
      console.error('Error fetching rules and responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId, enabled) => {
    try {
      const response = await fetch(`http://localhost:5005/api/admin/responses/rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        fetchRulesAndResponses();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const createRule = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/admin/responses/rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRule)
      });

      if (response.ok) {
        setShowCreateRule(false);
        setNewRule({
          name: '',
          description: '',
          triggers: [],
          conditions: [],
          actions: [],
          enabled: true,
          priority: 'medium'
        });
        fetchRulesAndResponses();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action) => {
    switch (action.type) {
      case 'block_user': return <Ban className="w-4 h-4 text-red-500" />;
      case 'flag_order': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'require_verification': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'notify_admin': return <Eye className="w-4 h-4 text-purple-500" />;
      default: return <Settings className="w-4 h-4 text-gray-500" />;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automated Response System</h2>
          <p className="text-gray-600 mt-1">Configure automated rules and responses for threat detection</p>
        </div>
        <button
          onClick={() => setShowCreateRule(true)}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Settings className="w-4 h-4 mr-2" />
          Create Rule
        </button>
      </div>

      {/* Active Rules */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Rules</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {rules.map((rule) => (
            <div key={rule.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium text-gray-900">{rule.name}</h4>
                    <span className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(rule.priority)}`}>
                      {rule.priority.toUpperCase()}
                    </span>
                    <div className="ml-3 flex items-center">
                      {rule.enabled ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`ml-1 text-sm ${rule.enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-1">{rule.description}</p>
                  
                  {/* Rule Details */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700">Triggers</h5>
                      <div className="mt-2 space-y-1">
                        {rule.triggers?.map((trigger, index) => (
                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700">Conditions</h5>
                      <div className="mt-2 space-y-1">
                        {rule.conditions?.map((condition, index) => (
                          <span key={index} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mr-2">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700">Actions</h5>
                      <div className="mt-2 space-y-1">
                        {rule.actions?.map((action, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-600">
                            {getActionIcon(action)}
                            <span className="ml-1">{action.type.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rule Statistics */}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Triggered:</span>
                      <span className="ml-2 font-medium">{rule.triggerCount || 0} times</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Success Rate:</span>
                      <span className="ml-2 font-medium">{rule.successRate || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Triggered:</span>
                      <span className="ml-2 font-medium">
                        {rule.lastTriggered ? new Date(rule.lastTriggered).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rule Controls */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleRule(rule.id, !rule.enabled)}
                    className={`p-2 rounded-lg ${
                      rule.enabled 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                  >
                    {rule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Automated Responses */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Automated Responses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action Taken
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {responses.map((response, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(response.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {response.ruleName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {response.trigger}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {getActionIcon(response.action)}
                      <span className="ml-2">{response.action.type?.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {response.targetType}: {response.targetId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      response.status === 'success' ? 'bg-green-100 text-green-800' :
                      response.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {response.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateRule && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Rule</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rule Name</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={newRule.priority}
                    onChange={(e) => setNewRule({...newRule, priority: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateRule(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={createRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedRules;
