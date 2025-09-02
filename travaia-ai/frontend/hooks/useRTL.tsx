import { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { rtlAwareStyles, getDirectionalSpacing } from '../utils/rtl-helpers';

/**
 * React hook for handling RTL-specific functionality
 * Provides utilities for RTL-aware styling and direction checks
 */
export const useRTL = () => {
  const { language } = useLocalization();
  const [isRTL, setIsRTL] = useState<boolean>(
    document.documentElement.dir === 'rtl',
  );

  // Update RTL state when language changes
  useEffect(() => {
    const rtlDirection = document.documentElement.dir === 'rtl';
    setIsRTL(rtlDirection);
  }, [language]);

  /**
   * Gets directional class for margins/padding that works with RTL
   */
  const getDirectionalClass = (
    property: 'margin' | 'padding',
    direction: 'start' | 'end' | 'inline-start' | 'inline-end',
    size: number,
  ): string => {
    return getDirectionalSpacing(property, direction, size);
  };

  /**
   * Converts logical CSS properties to physical ones based on direction
   */
  const getStyles = (styles: Record<string, any>): Record<string, any> => {
    return rtlAwareStyles(styles);
  };

  /**
   * Reverses an array if in RTL mode, useful for ordered content
   */
  const maybeReverseArray = <T,>(arr: T[]): T[] => {
    return isRTL ? [...arr].reverse() : arr;
  };

  /**
   * Returns the correct CSS flex direction considering RTL
   */
  const getFlexDirection = (direction: 'row' | 'column'): string => {
    if (direction === 'column') return 'flex-col';
    return isRTL ? 'flex-row-reverse' : 'flex-row';
  };

  return {
    isRTL,
    getDirectionalClass,
    getStyles,
    maybeReverseArray,
    getFlexDirection,
    // Helper constants
    startEdge: isRTL ? 'right' : 'left',
    endEdge: isRTL ? 'left' : 'right',
  };
};

export default useRTL;
