import { useMediaQuery } from 'react-responsive';

export const useResponsive = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });
  // Adjusted tablet to be exclusive of mobile and desktop for simpler logic in components
  const isTablet = useMediaQuery({
    query: '(min-width: 768px) and (max-width: 1023px)',
  });
  const isDesktop = useMediaQuery({ query: '(min-width: 1024px)' });

  return { isMobile, isTablet, isDesktop };
};
