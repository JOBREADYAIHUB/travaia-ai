/**
 * Route Performance Dashboard for Enterprise Monitoring
 * Real-time monitoring of routing system performance for 20M+ users
 */

import React, { useState, useEffect } from 'react';
import { enterpriseRouting } from '../../utils/enterpriseRouting';
import { routeMonitoring } from '../../utils/routeMonitoring';
import { routePreloader } from '../../utils/routePreloader';

interface PerformanceDashboardProps {
  className?: string;
}

const RoutePerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState(() => enterpriseRouting.getMetrics());
  const [cacheStats, setCacheStats] = useState(() => enterpriseRouting.getCacheStats());
  const [monitoringMetrics, setMonitoringMetrics] = useState(() => routeMonitoring.getMetrics());
  const [preloadStats, setPreloadStats] = useState(() => routePreloader.getPreloadStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(enterpriseRouting.getMetrics());
      setCacheStats(enterpriseRouting.getCacheStats());
      setMonitoringMetrics(routeMonitoring.getMetrics());
      setPreloadStats(routePreloader.getPreloadStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">🚀 Enterprise Routing Performance</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cache Performance */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="font-medium text-blue-800 mb-2">Cache Performance</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span className="font-mono text-blue-700">
                {formatPercentage(cacheStats.translationCache.hitRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cache Size:</span>
              <span className="font-mono text-blue-700">
                {cacheStats.translationCache.size}/{cacheStats.translationCache.maxSize}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Hits:</span>
              <span className="font-mono text-green-600">{metrics.cacheHits}</span>
            </div>
            <div className="flex justify-between">
              <span>Misses:</span>
              <span className="font-mono text-red-600">{metrics.cacheMisses}</span>
            </div>
          </div>
        </div>

        {/* Translation Performance */}
        <div className="bg-green-50 rounded-lg p-3">
          <h4 className="font-medium text-green-800 mb-2">Translation Speed</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Last Translation:</span>
              <span className="font-mono text-green-700">
                {formatTime(metrics.translationTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Navigation:</span>
              <span className="font-mono text-green-700">
                {formatTime(monitoringMetrics.averageNavigationTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Lang Switch:</span>
              <span className="font-mono text-green-700">
                {formatTime(monitoringMetrics.languageSwitchTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Error Tracking */}
        <div className="bg-red-50 rounded-lg p-3">
          <h4 className="font-medium text-red-800 mb-2">Error Tracking</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Error Count:</span>
              <span className="font-mono text-red-700">{metrics.errorCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Error Rate:</span>
              <span className="font-mono text-red-700">
                {formatPercentage(monitoringMetrics.errorRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Requests:</span>
              <span className="font-mono text-gray-600">{monitoringMetrics.totalRequests}</span>
            </div>
            {metrics.lastError && (
              <div className="text-xs text-red-600 mt-2 truncate" title={metrics.lastError.message}>
                Last: {metrics.lastError.message}
              </div>
            )}
          </div>
        </div>

        {/* Preloader Status */}
        <div className="bg-purple-50 rounded-lg p-3">
          <h4 className="font-medium text-purple-800 mb-2">Preloader Status</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Preloaded:</span>
              <span className="font-mono text-purple-700">{preloadStats.preloadedCombinations}</span>
            </div>
            <div className="flex justify-between">
              <span>Queue:</span>
              <span className="font-mono text-purple-700">{preloadStats.queueLength}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`font-mono ${preloadStats.isPreloading ? 'text-orange-600' : 'text-green-600'}`}>
                {preloadStats.isPreloading ? 'Loading' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => enterpriseRouting.clearCaches()}
          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
        >
          Clear Cache
        </button>
        <button
          onClick={() => enterpriseRouting.resetMetrics()}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
        >
          Reset Metrics
        </button>
        <button
          onClick={() => routePreloader.preloadLanguageRoutes('es', ['routes.dashboard', 'routes.analytics'])}
          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
        >
          Preload Spanish
        </button>
      </div>

      {/* System Status */}
      <div className="mt-4 text-xs text-gray-500">
        Enterprise Routing System v2.0 | Optimized for 20M+ daily users
      </div>
    </div>
  );
};

export default React.memo(RoutePerformanceDashboard);
