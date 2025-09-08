import React from 'react';
import DesktopPatients from './components/Desktop/DesktopPatients.jsx';
import useMobile from './hooks/useMobile.js';

/**
 * Patients page component.
 * Renders different components based on screen size:
 * - Mobile view is handled by MobileDashboard (patients tab)
 * - Desktop view uses DesktopPatients for screens >= 768px
 */
export default function Patients() {
  const { isMobile } = useMobile();
  
  // Force mobile for testing
  const forceMobile = window.innerWidth < 768;
  
  if (isMobile || forceMobile) {
    // Mobile view is handled by MobileDashboard component
    // This component should not be rendered on mobile
    return null;
  }
  
  // Desktop view
  return <DesktopPatients />;
}