/**
 * Enterprise Route Monitoring and Analytics System
 * Tracks performance metrics for 20M+ daily users
 */

interface RouteEvent {
  type: 'navigation' | 'language_switch' | 'error' | 'performance';
  timestamp: number;
  path: string;
  language: string;
  duration?: number;
  error?: string;
  userAgent?: string;
  sessionId: string;
}

interface PerformanceMetrics {
  averageNavigationTime: number;
  languageSwitchTime: number;
  errorRate: number;
  cacheHitRate: number;
  totalRequests: number;
  uniqueUsers: number;
}

interface RouteAnalytics {
  popularRoutes: Record<string, number>;
  languageDistribution: Record<string, number>;
  errorsByRoute: Record<string, number>;
  performanceByRoute: Record<string, number>;
}

class RouteMonitoringSystem {
  private static instance: RouteMonitoringSystem;
  private events: RouteEvent[] = [];
  private sessionId: string;
  private maxEvents: number = 1000; // Limit memory usage
  private reportingInterval: number = 60000; // 1 minute
  private reportingTimer?: NodeJS.Timeout;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startReporting();
  }

  public static getInstance(): RouteMonitoringSystem {
    if (!RouteMonitoringSystem.instance) {
      RouteMonitoringSystem.instance = new RouteMonitoringSystem();
    }
    return RouteMonitoringSystem.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startReporting(): void {
    if (process.env.NODE_ENV === 'production') {
      this.reportingTimer = setInterval(() => {
        this.sendMetricsToAnalytics();
      }, this.reportingInterval);
    }
  }

  public trackNavigation(path: string, language: string, duration: number): void {
    this.addEvent({
      type: 'navigation',
      timestamp: Date.now(),
      path,
      language,
      duration,
      sessionId: this.sessionId,
    });
  }

  public trackLanguageSwitch(fromLang: string, toLang: string, duration: number): void {
    this.addEvent({
      type: 'language_switch',
      timestamp: Date.now(),
      path: `${fromLang}->${toLang}`,
      language: toLang,
      duration,
      sessionId: this.sessionId,
    });
  }

  public trackError(path: string, language: string, error: string): void {
    this.addEvent({
      type: 'error',
      timestamp: Date.now(),
      path,
      language,
      error,
      sessionId: this.sessionId,
    });
  }

  public trackPerformance(path: string, language: string, metrics: any): void {
    this.addEvent({
      type: 'performance',
      timestamp: Date.now(),
      path,
      language,
      duration: metrics.duration,
      sessionId: this.sessionId,
    });
  }

  private addEvent(event: RouteEvent): void {
    this.events.push(event);
    
    // Limit memory usage by removing old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  public getMetrics(): PerformanceMetrics {
    const navigationEvents = this.events.filter(e => e.type === 'navigation');
    const languageSwitchEvents = this.events.filter(e => e.type === 'language_switch');
    const errorEvents = this.events.filter(e => e.type === 'error');
    const totalEvents = this.events.length;

    const averageNavigationTime = navigationEvents.length > 0
      ? navigationEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / navigationEvents.length
      : 0;

    const languageSwitchTime = languageSwitchEvents.length > 0
      ? languageSwitchEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / languageSwitchEvents.length
      : 0;

    return {
      averageNavigationTime,
      languageSwitchTime,
      errorRate: totalEvents > 0 ? errorEvents.length / totalEvents : 0,
      cacheHitRate: 0, // Will be populated from enterprise routing
      totalRequests: totalEvents,
      uniqueUsers: 1, // Single session for now
    };
  }

  public getAnalytics(): RouteAnalytics {
    const popularRoutes: Record<string, number> = {};
    const languageDistribution: Record<string, number> = {};
    const errorsByRoute: Record<string, number> = {};
    const performanceByRoute: Record<string, number> = {};

    this.events.forEach(event => {
      // Popular routes
      if (event.type === 'navigation') {
        popularRoutes[event.path] = (popularRoutes[event.path] || 0) + 1;
      }

      // Language distribution
      languageDistribution[event.language] = (languageDistribution[event.language] || 0) + 1;

      // Errors by route
      if (event.type === 'error') {
        errorsByRoute[event.path] = (errorsByRoute[event.path] || 0) + 1;
      }

      // Performance by route
      if (event.type === 'navigation' && event.duration) {
        if (!performanceByRoute[event.path]) {
          performanceByRoute[event.path] = event.duration;
        } else {
          performanceByRoute[event.path] = (performanceByRoute[event.path] + event.duration) / 2;
        }
      }
    });

    return {
      popularRoutes,
      languageDistribution,
      errorsByRoute,
      performanceByRoute,
    };
  }

  private async sendMetricsToAnalytics(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      const metrics = this.getMetrics();
      const analytics = this.getAnalytics();

      // In production, this would send to your analytics service
      // For now, we'll just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚀 TRAVAIA Route Analytics');
        console.log('Performance Metrics:', metrics);
        console.log('Route Analytics:', analytics);
        console.groupEnd();
      }

      // Example: Send to analytics service
      // await fetch('/api/analytics/routes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ metrics, analytics, sessionId: this.sessionId })
      // });

      // Clear events after reporting to prevent memory buildup
      this.events = [];

    } catch (error) {
      console.error('Failed to send route analytics:', error);
    }
  }

  public destroy(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
  }
}

// Export singleton instance
export const routeMonitoring = RouteMonitoringSystem.getInstance();

// Export types
export type { RouteEvent, PerformanceMetrics, RouteAnalytics };
