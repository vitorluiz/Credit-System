import React from 'react';
import MobileDashboard from './components/Mobile/MobileDashboard.jsx';
import DesktopDashboard from './components/Desktop/DesktopDashboard.jsx';
import useMobile from './hooks/useMobile.js';

/**
 * Dashboard page for regular users. 
 * Renders different components based on screen size:
 * - MobileDashboard for screens < 768px
 * - DesktopDashboard for screens >= 768px
 */
export default function Dashboard() {
  const { isMobile } = useMobile();
  
  // Use mobile component for mobile devices
  console.log('Dashboard - isMobile:', isMobile, 'screenWidth:', window.innerWidth);
  
  if (isMobile) {
    console.log('Dashboard - Rendering MobileDashboard');
    return <MobileDashboard />;
  }
  
  console.log('Dashboard - Rendering DesktopDashboard');
  return <DesktopDashboard />;
}