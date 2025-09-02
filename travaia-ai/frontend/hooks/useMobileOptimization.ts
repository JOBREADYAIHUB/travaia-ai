/**
 * Mobile Optimization Hook
 * Provides mobile-specific functionality and responsive behavior
 */

import { useState, useEffect, useCallback } from 'react';

interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchSupported: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  viewportHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface MobileGestures {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onPinch: (scale: number) => void;
  onTap: (x: number, y: number) => void;
  onLongPress: (x: number, y: number) => void;
}

export const useMobileOptimization = (gestures?: Partial<MobileGestures>) => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    touchSupported: false,
    isIOS: false,
    isAndroid: false,
    viewportHeight: 0,
    safeAreaInsets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  });

  // Touch gesture handling
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null);

  // Update screen information
  const updateScreenInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Detect device type
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Calculate safe area insets (for devices with notches, etc.)
    const safeAreaInsets = {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
      left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
      right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0'),
    };

    // Calculate actual viewport height (accounting for mobile browser UI)
    const viewportHeight = window.visualViewport?.height || height;

    setState({
      isMobile,
      isTablet,
      isDesktop,
      screenWidth: width,
      screenHeight: height,
      orientation,
      touchSupported,
      isIOS,
      isAndroid,
      viewportHeight,
      safeAreaInsets,
    });
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    });
  }, []);

  // Handle touch end and detect gestures
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const touchEndData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setTouchEnd(touchEndData);

    const deltaX = touchEndData.x - touchStart.x;
    const deltaY = touchEndData.y - touchStart.y;
    const deltaTime = touchEndData.time - touchStart.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Detect swipe gestures
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    const minSwipeVelocity = 0.1;

    if (distance > minSwipeDistance && deltaTime < maxSwipeTime && velocity > minSwipeVelocity) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      if (angle > -45 && angle < 45) {
        // Swipe right
        gestures?.onSwipeRight?.();
      } else if (angle > 45 && angle < 135) {
        // Swipe down
        gestures?.onSwipeDown?.();
      } else if (angle > 135 || angle < -135) {
        // Swipe left
        gestures?.onSwipeLeft?.();
      } else if (angle > -135 && angle < -45) {
        // Swipe up
        gestures?.onSwipeUp?.();
      }
    } else if (distance < 10 && deltaTime < 200) {
      // Tap gesture
      gestures?.onTap?.(touchStart.x, touchStart.y);
    } else if (distance < 10 && deltaTime > 500) {
      // Long press gesture
      gestures?.onLongPress?.(touchStart.x, touchStart.y);
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, gestures]);

  // Handle pinch gestures
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && gestures?.onPinch) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // Calculate scale relative to initial distance
      // This is a simplified implementation - you might want to store initial distance
      const scale = distance / 100; // Normalize to a reasonable scale
      gestures.onPinch(scale);
    }
  }, [gestures]);

  // Initialize screen info on mount
  useEffect(() => {
    updateScreenInfo();
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Screen resize listener
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);

    // Visual viewport listener for mobile browsers
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateScreenInfo);
    }

    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateScreenInfo);
      }
    };
  }, []);

  // Set up touch gesture listeners separately
  useEffect(() => {
    if (state.touchSupported && gestures) {
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [state.touchSupported, gestures, handleTouchStart, handleTouchEnd, handleTouchMove]);

  // Utility functions
  const getResponsiveValue = useCallback(<T,>(mobile: T, tablet: T, desktop: T): T => {
    if (state.isMobile) return mobile;
    if (state.isTablet) return tablet;
    return desktop;
  }, [state.isMobile, state.isTablet]);

  const getResponsiveClass = useCallback((mobileClass: string, tabletClass?: string, desktopClass?: string): string => {
    if (state.isMobile) return mobileClass;
    if (state.isTablet && tabletClass) return tabletClass;
    if (desktopClass) return desktopClass;
    return '';
  }, [state.isMobile, state.isTablet]);

  // Prevent zoom on double tap (iOS Safari)
  useEffect(() => {
    if (state.isIOS) {
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchstart', preventZoom, { passive: false });
      return () => document.removeEventListener('touchstart', preventZoom);
    }
  }, [state.isIOS]);

  // Set CSS custom properties for safe area insets
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--safe-area-inset-top', `${state.safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${state.safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${state.safeAreaInsets.left}px`);
    root.style.setProperty('--safe-area-inset-right', `${state.safeAreaInsets.right}px`);
  }, [state.safeAreaInsets]);

  // Haptic feedback (if supported)
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Prevent pull-to-refresh on mobile
  useEffect(() => {
    if (state.isMobile) {
      const preventPullToRefresh = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Allow pull-to-refresh only on scrollable elements at the top
        if (element && element.scrollTop === 0) {
          e.preventDefault();
        }
      };

      document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
      document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

      return () => {
        document.removeEventListener('touchstart', preventPullToRefresh);
        document.removeEventListener('touchmove', preventPullToRefresh);
      };
    }
  }, [state.isMobile]);

  return {
    ...state,
    getResponsiveValue,
    getResponsiveClass,
    hapticFeedback,
  };
};

export default useMobileOptimization;
