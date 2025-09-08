import React from 'react';
import DesktopNewRequest from './components/Desktop/DesktopNewRequest.jsx';
import useMobile from './hooks/useMobile.js';

/**
 * New Request page component.
 * Renders different components based on screen size:
 * - Mobile view is handled by MobileDashboard (comprar crédito tab)
 * - Desktop view uses DesktopNewRequest for screens >= 768px
 */
export default function NewRequest() {
  const { isMobile } = useMobile();
  
  // Force mobile for testing
  const forceMobile = window.innerWidth < 768;
  
  if (isMobile || forceMobile) {
    // Mobile view is handled by MobileDashboard component
    // This component should not be rendered on mobile
    return null;
  }
  
  // Desktop view
  return <DesktopNewRequest />;
}