/**
 * RTL Helper Functions
 * Utilities to assist with right-to-left language support
 */

/**
 * Determines if the current layout direction is RTL
 * @returns boolean indicating if current layout is RTL
 */
export const isRTL = (): boolean => {
  return document.documentElement.dir === 'rtl';
};

/**
 * Gets appropriate margin or padding class based on direction
 *
 * @param direction 'start' | 'end' | 'inline-start' | 'inline-end'
 * @param size size value (1-12)
 * @returns appropriate margin class for the current layout direction
 */
export const getDirectionalSpacing = (
  property: 'margin' | 'padding',
  direction: 'start' | 'end' | 'inline-start' | 'inline-end',
  size: number,
): string => {
  // Tailwind doesn't support logical properties directly
  // so we need to map to physical properties based on direction
  const logicalToPhysical = isRTL()
    ? {
        start: 'right',
        end: 'left',
        'inline-start': 'right',
        'inline-end': 'left',
      }
    : {
        start: 'left',
        end: 'right',
        'inline-start': 'left',
        'inline-end': 'right',
      };

  const physical = logicalToPhysical[direction];
  const prefix = property === 'margin' ? 'm' : 'p';

  return `${prefix}${physical[0]}-${size}`;
};

/**
 * Creates a style object for RTL-aware CSS
 * Uses CSS logical properties which automatically adjust for RTL
 *
 * @param styles Object containing CSS logical properties
 * @returns CSS properties object
 */
export const rtlAwareStyles = (
  styles: Record<string, any>,
): Record<string, any> => {
  // Create a new object to avoid mutations
  const result: Record<string, any> = {};

  // Map of logical CSS properties to their physical counterparts
  const logicalToPhysical: Record<string, string> = {
    'margin-inline-start': isRTL() ? 'margin-right' : 'margin-left',
    'margin-inline-end': isRTL() ? 'margin-left' : 'margin-right',
    'padding-inline-start': isRTL() ? 'padding-right' : 'padding-left',
    'padding-inline-end': isRTL() ? 'padding-left' : 'padding-right',
    'border-inline-start': isRTL() ? 'border-right' : 'border-left',
    'border-inline-end': isRTL() ? 'border-left' : 'border-right',
    'inset-inline-start': isRTL() ? 'right' : 'left',
    'inset-inline-end': isRTL() ? 'left' : 'right',
  };

  // Convert logical properties to physical ones based on current direction
  Object.entries(styles).forEach(([key, value]) => {
    if (key in logicalToPhysical) {
      result[logicalToPhysical[key]] = value;
    } else {
      result[key] = value;
    }
  });

  return result;
};

/**
 * For modern browsers that support CSS logical properties natively
 * @returns CSS object with logical properties
 */
export const modernLogicalStyles = {
  marginInlineStart: '1rem', // automatically becomes margin-left or margin-right
  paddingInlineEnd: '1rem', // based on the current text direction
  borderInlineStart: '1px solid gray',
  insetInlineStart: '0',
};

export default {
  isRTL,
  getDirectionalSpacing,
  rtlAwareStyles,
  modernLogicalStyles,
};
