export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  component?: string;
}

export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxLocalEntries: number;
  enableUserTracking: boolean;
}

class LoggingService {
  private config: LoggingConfig;
  private localEntries: LogEntry[] = [];
  private sessionId: string;

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      maxLocalEntries: 1000,
      enableUserTracking: true,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandler();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandler(): void {
    window.addEventListener('error', (event) => {
      this.error('Global Error', 'window', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', 'window', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    component?: string
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      sessionId: this.sessionId,
      component,
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from auth context or localStorage
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.uid || parsed.user?.id;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return undefined;
  }

  private formatConsoleMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    const component = entry.component ? `{${entry.component}}` : '';
    
    return `${timestamp} ${level} ${context}${component} ${entry.message}`;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const message = this.formatConsoleMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
    }
  }

  private storeLocally(entry: LogEntry): void {
    this.localEntries.push(entry);
    
    // Keep only the most recent entries
    if (this.localEntries.length > this.config.maxLocalEntries) {
      this.localEntries = this.localEntries.slice(-this.config.maxLocalEntries);
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Fallback to console if remote logging fails
      console.error('Failed to log to remote endpoint:', error);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    component?: string
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, data, component);
    
    this.logToConsole(entry);
    this.storeLocally(entry);
    
    if (this.config.enableRemote) {
      this.logToRemote(entry).catch(() => {
        // Silent fail for remote logging
      });
    }
  }

  // Public logging methods
  debug(message: string, context?: string, data?: any, component?: string): void {
    this.log(LogLevel.DEBUG, message, context, data, component);
  }

  info(message: string, context?: string, data?: any, component?: string): void {
    this.log(LogLevel.INFO, message, context, data, component);
  }

  warn(message: string, context?: string, data?: any, component?: string): void {
    this.log(LogLevel.WARN, message, context, data, component);
  }

  error(message: string, context?: string, data?: any, component?: string): void {
    this.log(LogLevel.ERROR, message, context, data, component);
  }

  // Utility methods
  getLocalEntries(): LogEntry[] {
    return [...this.localEntries];
  }

  clearLocalEntries(): void {
    this.localEntries = [];
  }

  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Component-specific logging helpers
  logUserAction(action: string, component: string, data?: any): void {
    this.info(`User action: ${action}`, 'user-action', data, component);
  }

  logApiCall(endpoint: string, method: string, status?: number, duration?: number): void {
    this.info(`API ${method} ${endpoint}`, 'api-call', { status, duration });
  }

  logPerformance(metric: string, value: number, component?: string): void {
    this.info(`Performance: ${metric}`, 'performance', { value, unit: 'ms' }, component);
  }

  logError(error: Error, context?: string, component?: string): void {
    this.error(error.message, context, {
      name: error.name,
      stack: error.stack,
      cause: error.cause
    }, component);
  }
}

// Create singleton instance
const defaultConfig: Partial<LoggingConfig> = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.REACT_APP_LOGGING_ENDPOINT,
  maxLocalEntries: 1000,
  enableUserTracking: true
};

export const logger = new LoggingService(defaultConfig);

// Export for testing and advanced usage
export { LoggingService };
