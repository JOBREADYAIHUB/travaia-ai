# TRAVAIA Routing System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Enterprise Routing System](#enterprise-routing-system)
5. [Internationalization Integration](#internationalization-integration)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring and Analytics](#monitoring-and-analytics)
8. [Route Preloading](#route-preloading)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)
11. [API Reference](#api-reference)

## Overview

TRAVAIA employs an enterprise-grade routing system designed to handle 20M+ daily users with full internationalization support. The system provides:

- **Multilingual URL routing** with translated paths
- **High-performance caching** with LRU cache implementation
- **Real-time performance monitoring** and analytics
- **Intelligent route preloading** for optimal user experience
- **Comprehensive error handling** with fallback mechanisms
- **RTL language support** for Arabic and other RTL languages

## Architecture

The routing system follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│           Application Layer             │
├─────────────────────────────────────────┤
│  EnterpriseRouter.tsx                   │
│  ├── LanguageWrapper                    │
│  ├── PrivateRoute                       │
│  └── Route Definitions                  │
├─────────────────────────────────────────┤
│           Service Layer                 │
├─────────────────────────────────────────┤
│  enterpriseRouting.ts                   │
│  ├── Path Translation                   │
│  ├── Language Mapping                   │
│  └── Cache Management                   │
├─────────────────────────────────────────┤
│          Utility Layer                  │
├─────────────────────────────────────────┤
│  routeUtils.ts                          │
│  routeMonitoring.ts                     │
│  routePreloader.ts                      │
└─────────────────────────────────────────┘
```

## Core Components

### EnterpriseRouter Component

The main router component (`EnterpriseRouter.tsx`) handles route configuration and language synchronization:

```typescript
// Route definitions with translated paths
const routes = [
  {
    path: `/${language}/${t('routes.dashboard')}`,
    element: <Dashboard />,
    key: 'dashboard'
  },
  {
    path: `/${language}/${t('routes.analytics')}`,
    element: <Analytics />,
    key: 'analytics'
  },
  // ... more routes
];
```

**Key Features:**
- Dynamic route generation based on current language
- Memoized private routes for performance
- Language wrapper for synchronization
- Error boundary integration
- Performance monitoring hooks

### LanguageWrapper Component

Synchronizes language state between URL and i18n system:

```typescript
const handleLanguageSync = useCallback(async (urlLanguage: string) => {
  if (i18n.language !== urlLanguage) {
    setIsLoading(true);
    try {
      await i18n.loadLanguages(urlLanguage);
      await i18n.changeLanguage(urlLanguage);
      const mappedPath = await enterpriseRouting.mapPathToLanguage(currentPath, urlLanguage);
      // Handle path mapping and navigation
    } catch (err) {
      setError(`Failed to load language: ${urlLanguage}`);
    } finally {
      setIsLoading(false);
    }
  }
}, [i18n, location.pathname]);
```

### Route Utilities

The `routeUtils.ts` provides essential routing utilities:

- `mapPathToLanguage()` - Maps current path to target language
- `getCanonicalRouteKey()` - Extracts route key from translated path
- `synchronizeLanguage()` - Synchronizes language across components

## Enterprise Routing System

### Core Architecture

The `EnterpriseRoutingSystem` class implements a singleton pattern with advanced features:

```typescript
class EnterpriseRoutingSystem {
  private translationCache: LRUCache<string, string>;
  private routeKeyCache: LRUCache<string, string>;
  private metrics: RouteMetrics;
  private preloadedLanguages: Set<string>;
}
```

### Configuration

```typescript
interface EnterpriseRoutingConfig {
  supportedLanguages: string[];      // ['en', 'es', 'fr', 'de', 'ar']
  defaultLanguage: string;           // 'en'
  cache: {
    maxSize: number;                 // 10000 translations
    ttl: number;                     // 1 hour TTL
    updateAgeOnGet: boolean;         // true
  };
  fallbackBehavior: 'redirect' | 'preserve' | 'error';
  enableMetrics: boolean;            // true
  enablePreloading: boolean;         // true
}
```

### Path Translation Process

1. **Input Validation** - Validates path and target language
2. **Language Loading** - Ensures target language resources are loaded
3. **URL Parsing** - Extracts path, query string, and hash fragments
4. **Route Key Lookup** - Finds corresponding route key using cache
5. **Translation** - Gets translated path for target language
6. **Dynamic Segment Preservation** - Maintains URL parameters
7. **Result Assembly** - Constructs final URL with language prefix

### Caching Strategy

The system uses dual LRU caches for optimal performance:

- **Translation Cache**: Stores `routeKey:language → translatedPath` mappings
- **Route Key Cache**: Stores `path:language → routeKey` mappings

Cache statistics:
- Maximum size: 10,000 entries per cache
- TTL: 1 hour
- Hit rate tracking for performance monitoring

## Internationalization Integration

### URL Structure

TRAVAIA uses language-prefixed URLs with translated path segments:

```
Format: /{language}/{translated-path}

Examples:
- /en/dashboard
- /es/panel-de-control
- /fr/tableau-de-bord
- /ar/لوحة-التحكم
- /de/dashboard
```

### Route Translation Examples

| Route Key | English | Spanish | French | Arabic | German |
|-----------|---------|---------|--------|--------|--------|
| `routes.dashboard` | dashboard | panel-de-control | tableau-de-bord | لوحة-التحكم | dashboard |
| `routes.analytics` | analytics | analiticas | analytique | تحليلات | analytik |
| `routes.jobs` | jobs | empleos | emplois | وظائف | stellen |
| `routes.profile` | profile | perfil | profil | الملف-الشخصي | profil |

### Language Detection and Switching

The system supports multiple language detection methods:
1. URL language prefix (highest priority)
2. Query string parameter (`?lng=es`)
3. Local storage preference
4. Browser language settings
5. Fallback to English

Language switching process:
1. Load target language resources
2. Map current path to target language
3. Update i18n language
4. Navigate to translated URL
5. Update document attributes (lang, dir)
6. Store user preference

## Performance Optimization

### Preloading Strategy

The `RoutePreloader` implements intelligent preloading:

```typescript
interface PreloadConfig {
  criticalLanguages: string[];       // ['en', 'es']
  criticalRoutes: string[];          // Common routes
  preloadOnIdle: boolean;            // true
  maxConcurrentPreloads: number;     // 3
}
```

**Preloading Process:**
1. Load critical language combinations on app start
2. Warm up enterprise routing cache
3. Use `requestIdleCallback` for non-critical preloading
4. Process preload queue with concurrency limits

### Cache Warming

Critical routes are preloaded for the most common languages:
- Dashboard, Login, Analytics, Profile, Jobs
- English and Spanish (most common languages)
- Automatic cache warming during idle time

### Performance Metrics

Real-time tracking of:
- Translation time (average: <2ms)
- Cache hit rate (target: >95%)
- Navigation time
- Language switch time
- Error rates

## Monitoring and Analytics

### Route Monitoring System

The `RouteMonitoringSystem` tracks comprehensive metrics:

```typescript
interface RouteEvent {
  type: 'navigation' | 'language_switch' | 'error' | 'performance';
  timestamp: number;
  path: string;
  language: string;
  duration?: number;
  error?: string;
  sessionId: string;
}
```

### Performance Dashboard

Real-time monitoring dashboard displays:
- **Cache Performance**: Hit rate, cache size, hits/misses
- **Translation Speed**: Last translation time, average navigation time
- **Error Tracking**: Error count, error rate, last error details
- **Preloader Status**: Preloaded combinations, queue length, status

### Analytics Data

The system collects:
- Popular routes by language
- Language distribution
- Errors by route
- Performance metrics by route
- User session analytics

## Route Preloading

### Intelligent Preloading

The preloader uses multiple strategies:

1. **Critical Route Preloading**: Immediate loading of essential routes
2. **Idle Time Preloading**: Background loading during browser idle time
3. **Predictive Preloading**: Based on user navigation patterns
4. **Batch Processing**: Concurrent preloading with limits

### Preload Queue Management

```typescript
class RoutePreloader {
  private preloadQueue: Array<{ language: string; routes: string[] }>;
  private preloadedCombinations: Set<string>;
  
  public preloadLanguageRoutes(language: string, routes: string[]): void {
    this.preloadQueue.push({ language, routes });
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }
}
```

## Error Handling

### Fallback Strategies

The system provides three fallback behaviors:

1. **Redirect**: Redirect to dashboard in target language
2. **Preserve**: Keep original path structure
3. **Error**: Throw error for debugging

### Error Recovery

- Automatic fallback to dashboard on translation failure
- Graceful degradation for unsupported languages
- Error logging and metrics collection
- User-friendly error messages

### Route Validation

- Input parameter validation
- Supported language verification
- Path structure validation
- Dynamic segment preservation

## Best Practices

### Route Definition

```typescript
// ✅ Good: Use translation keys
{
  path: `/${language}/${t('routes.dashboard')}`,
  element: <Dashboard />,
  key: 'dashboard'
}

// ❌ Bad: Hardcoded paths
{
  path: `/${language}/dashboard`,
  element: <Dashboard />
}
```

### Navigation

```typescript
// ✅ Good: Use enterprise routing hook
const { navigateToRoute } = useEnterpriseRouting();
navigateToRoute('routes.dashboard', { userId: '123' });

// ❌ Bad: Manual navigation
navigate(`/${language}/dashboard/123`);
```

### Performance

- Always use memoization for route components
- Implement proper loading states
- Use route preloading for critical paths
- Monitor cache hit rates

### Accessibility

- Set proper `lang` attribute on document
- Handle RTL languages correctly
- Provide loading indicators
- Ensure keyboard navigation works

## API Reference

### useEnterpriseRouting Hook

```typescript
interface UseEnterpriseRoutingReturn {
  navigateToRoute: (routeKey: string, params?: Record<string, string>) => Promise<void>;
  switchLanguage: (targetLanguage: string) => Promise<void>;
  isNavigating: boolean;
  currentLanguage: string;
  metrics: RouteMetrics;
  cacheStats: any;
  preloadLanguage: (language: string) => Promise<void>;
  clearCache: () => void;
}
```

### Enterprise Routing Methods

```typescript
class EnterpriseRoutingSystem {
  // Map path to target language
  mapPathToLanguage(currentPath: string, targetLanguage: string): Promise<string>;
  
  // Get performance metrics
  getMetrics(): RouteMetrics;
  
  // Reset metrics
  resetMetrics(): void;
  
  // Clear caches
  clearCaches(): void;
  
  // Get cache statistics
  getCacheStats(): CacheStats;
}
```

### Route Monitoring

```typescript
class RouteMonitoringSystem {
  // Track navigation event
  trackNavigation(path: string, language: string, duration: number): void;
  
  // Track language switch
  trackLanguageSwitch(fromLang: string, toLang: string, duration: number): void;
  
  // Track error
  trackError(path: string, language: string, error: string): void;
  
  // Get performance metrics
  getMetrics(): PerformanceMetrics;
  
  // Get analytics data
  getAnalytics(): RouteAnalytics;
}
```

### Route Preloader

```typescript
class RoutePreloader {
  // Preload specific language routes
  preloadLanguageRoutes(language: string, routes: string[]): void;
  
  // Get preload statistics
  getPreloadStats(): PreloadStats;
}
```

---

**System Status**: Enterprise Routing System v2.0 | Optimized for 20M+ daily users

This routing system provides enterprise-grade performance, reliability, and internationalization support for the TRAVAIA platform, ensuring optimal user experience across all supported languages and regions.
