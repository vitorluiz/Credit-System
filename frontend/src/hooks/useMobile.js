import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile devices and screen size
 * Returns an object with mobile detection and screen size information
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);
    
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      
      console.log('useMobile - Screen width:', width, 'isMobile:', mobile, 'isTablet:', tablet);
      
      setScreenWidth(width);
      setIsMobile(mobile);
      setIsTablet(tablet);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Return false for mobile during SSR to prevent hydration mismatch
  if (!isClient) {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: 0,
      isSmallMobile: false,
      isLargeMobile: false
    };
  }

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenWidth,
    isSmallMobile: screenWidth < 480,
    isLargeMobile: screenWidth >= 480 && screenWidth < 768
  };
}

export default useMobile;
