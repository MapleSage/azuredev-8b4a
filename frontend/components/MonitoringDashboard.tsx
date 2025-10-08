/**
 * Monitoring Dashboard Component
 * Real-time monitoring of Azure services, intent detection, and performance
 */

import React, { useState, useEffect } from "react";
import MonitoringSystem, {
  ServiceHealth,
  MonitoringAlert,
} from "../lib/monitoring-system";

interface MonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [serviceHealth, setServiceHealth] = useState<
    Map<string, ServiceHealth>
  >(new Map());
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [intentSummary, setIntentSummary] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const monitoring = MonitoringSystem.getInstance();

  useEffect(() => {
    if (isOpen) {
      updateData();
      const interval = setInterval(updateData, 5000); // Update every 5 seconds
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [isOpen]);

  const updateData = () => {
    setServiceHealth(monitoring.getServiceHealth());
    setAlerts(monitoring.getRecentAlerts(10));
    setPerformanceSummary(monitoring.getPerformanceSummary());
    setIntentSummary(monitoring.getIntentAccuracySummary());
  };

  const getStatusColor = (status: ServiceHealth["status"]) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "degraded":
        return "text-yellow-600 bg-yellow-100";
      case "unhealthy":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: ServiceHealth["status"]) => {
    switch (status) {
      case "healthy":
        return "✅";
      case "degraded":
        return "⚠️";
      case "unhealthy":
        return "❌";
      default:
        return "❓";
    }
  };

  const getAlertIcon = (type: MonitoringAlert["type"]) => {
    switch (type) {
      case "error":
        return "🚨";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📝";
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📊</span>
            <h2 className="text-xl font-bold">
              SageInsure Monitoring Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto h-full">
          {/* Service Health Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🏥</span>
              Service Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(serviceHealth.entries()).map(
                ([serviceName, health]) => (
                  <div
                    key={serviceName}
                    className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {serviceName.replace("-", " ")}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                        {getStatusIcon(health.status)} {health.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Response: {formatDuration(health.responseTime)}</div>
                      <div>Error Rate: {health.errorRate.toFixed(1)}%</div>
                      <div>Last Check: {formatTimestamp(health.lastCheck)}</div>
                      <div className="text-xs">{health.details}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Performance Summary */}
          {performanceSummary && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">⚡</span>
                Performance Summary (Last Hour)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceSummary.totalOperations}
                  </div>
                  <div className="text-sm text-blue-800">Total Operations</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {performanceSummary.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-800">Success Rate</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatDuration(performanceSummary.averageResponseTime)}
                  </div>
                  <div className="text-sm text-yellow-800">
                    Avg Response Time
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {performanceSummary.slowOperations}
                  </div>
                  <div className="text-sm text-red-800">Slow Operations</div>
                </div>
              </div>
            </div>
          )}

          {/* Intent Detection Accuracy */}
          {intentSummary && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Intent Detection Accuracy (Last Hour)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {intentSummary.totalDetections}
                  </div>
                  <div className="text-sm text-purple-800">
                    Total Detections
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {intentSummary.accuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-green-800">Accuracy</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {(intentSummary.averageConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-blue-800">Avg Confidence</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">
                    {intentSummary.lowConfidenceDetections}
                  </div>
                  <div className="text-sm text-orange-800">Low Confidence</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Alerts */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🚨</span>
              Recent Alerts
            </h3>
            <div className="bg-gray-50 rounded-lg border">
              {alerts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <span className="text-2xl">✨</span>
                  <div>No recent alerts - all systems running smoothly!</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 ${alert.resolved ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <span className="text-lg mr-3">
                            {getAlertIcon(alert.type)}
                          </span>
                          <div>
                            <div className="font-medium">
                              [{alert.service.toUpperCase()}] {alert.message}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatTimestamp(alert.timestamp)}
                              {alert.resolved && (
                                <span className="ml-2 text-green-600">
                                  ✓ Resolved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!alert.resolved && (
                          <button
                            onClick={() => monitoring.resolveAlert(alert.id)}
                            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200">
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error Breakdown */}
          {performanceSummary &&
            Object.keys(performanceSummary.errorsByType).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🔍</span>
                  Error Breakdown
                </h3>
                <div className="bg-gray-50 rounded-lg border p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(performanceSummary.errorsByType).map(
                      ([errorType, count]) => (
                        <div
                          key={errorType}
                          className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="font-medium">{errorType}</span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                            {String(count)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Intent Corrections */}
          {intentSummary &&
            Object.keys(intentSummary.correctionsBySpecialist).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🔄</span>
                  Intent Corrections
                </h3>
                <div className="bg-gray-50 rounded-lg border p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(intentSummary.correctionsBySpecialist).map(
                      ([specialist, count]) => (
                        <div
                          key={specialist}
                          className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="font-medium">
                            {specialist.replace("_", " ")}
                          </span>
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                            {String(count)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
