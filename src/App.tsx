import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout, type NavSection } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { DevicesPage } from './pages/DevicesPage';
import { AIDiscoveryPage } from './pages/AIDiscoveryPage';
import { MCPInspectionPage } from './pages/MCPInspectionPage';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage';
import { ActivityMonitoringPage } from './pages/ActivityMonitoringPage';
import { ScanReportsPage } from './pages/ScanReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function ConsoleShell() {
  const { user, loading } = useAuth();
  const [section, setSection] = useState<NavSection>('overview');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14] text-xs text-slate-400">
        Connecting to Aiteebar Security Console...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const openScanReport = (scanId: string) => {
    setSelectedScanId(scanId);
    setSection('scan-reports');
  };

  return (
    <Layout
      activeSection={section}
      onNavigate={(next) => {
        if (next !== 'scan-reports') {
          setSelectedScanId(null);
        }
        setSection(next);
      }}
    >
      {section === 'overview' && (
        <OverviewPage onNavigate={setSection} onOpenScan={openScanReport} />
      )}
      {section === 'devices' && <DevicesPage onOpenScan={openScanReport} />}
      {section === 'ai-discovery' && <AIDiscoveryPage />}
      {section === 'mcp-inspection' && <MCPInspectionPage />}
      {section === 'risk-assessment' && <RiskAssessmentPage />}
      {section === 'activity-monitoring' && <ActivityMonitoringPage />}
      {section === 'scan-reports' && (
        <ScanReportsPage
          initialScanId={selectedScanId}
          onClearInitialScan={() => setSelectedScanId(null)}
        />
      )}
      {section === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ConsoleShell />
    </AuthProvider>
  );
}
