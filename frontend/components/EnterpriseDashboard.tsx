import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/msal-auth-context';

interface AuditLog {
  event: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  role?: string;
}

interface SystemMetrics {
  activeUsers: number;
  totalSessions: number;
  securityEvents: number;
  systemUptime: string;
  lastBackup: string;
}

export const EnterpriseDashboard: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Load audit logs from localStorage (in production, fetch from API)
    const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    setAuditLogs(logs.slice(-20)); // Show last 20 logs

    // Simulate system metrics
    setMetrics({
      activeUsers: 12,
      totalSessions: 45,
      securityEvents: 3,
      systemUptime: '99.9%',
      lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    });
  }, []);

  const getEventIcon = (event: string): string => {
    const icons = {
      USER_LOGIN: '🔐',
      TOKEN_ACQUIRED: '🎫',
      MFA_VERIFIED: '🛡️',
      SESSION_TIMEOUT: '⏰',
      LOGIN_FAILURE: '❌',
      LOGOUT_SUCCESS: '🚪',
    };
    return icons[event as keyof typeof icons] || '📝';
  };

  const getEventColor = (event: string): string => {
    const colors = {
      USER_LOGIN: 'text-green-600',
      TOKEN_ACQUIRED: 'text-blue-600',
      MFA_VERIFIED: 'text-purple-600',
      SESSION_TIMEOUT: 'text-yellow-600',
      LOGIN_FAILURE: 'text-red-600',
      LOGOUT_SUCCESS: 'text-gray-600',
    };
    return colors[event as keyof typeof colors] || 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const userRole = sessionStorage.getItem('userRole') || 'customer';

  // Only show dashboard to admin users
  if (userRole !== 'admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Administrator privileges required to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Dashboard</h1>
            <p className="text-gray-600">System monitoring and audit logs</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
            <span className="text-sm text-gray-600">System Operational</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'audit', label: 'Audit Logs', icon: '📋' },
              { id: 'security', label: 'Security', icon: '🔒' },
              { id: 'users', label: 'Users', icon: '👥' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">👥</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.activeUsers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🔗</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalSessions}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Security Events</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.securityEvents}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">⏱️</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.systemUptime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {auditLogs.slice(0, 5).map((log, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <span className="text-2xl">{getEventIcon(log.event)}</span>
                      <div className="flex-1">
                        <p className={`font-medium ${getEventColor(log.event)}`}>
                          {log.event.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTimestamp(log.timestamp)} • Session: {log.sessionId?.slice(-8)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
              <p className="text-sm text-gray-600">Complete system audit trail</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getEventIcon(log.event)}</span>
                          <span className={`font-medium ${getEventColor(log.event)}`}>
                            {log.event.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userId?.slice(-8) || 'System'}
                        {log.role && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            {log.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {log.sessionId?.slice(-8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <span>Multi-Factor Authentication</span>
                  </div>
                  <span className="text-green-600 font-medium">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <span>Session Encryption</span>
                  </div>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <span>Audit Logging</span>
                  </div>
                  <span className="text-green-600 font-medium">Monitoring</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <span>Data Backup</span>
                  </div>
                  <span className="text-green-600 font-medium">
                    {metrics && formatTimestamp(metrics.lastBackup)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
            <p className="text-gray-600">User management features would be implemented here in a full enterprise system.</p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Enterprise Features:</strong> User provisioning, role management, access reviews, and compliance reporting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseDashboard;