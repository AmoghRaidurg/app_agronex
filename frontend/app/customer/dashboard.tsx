import React from 'react';
import RoleDashboard, { RoleDashboardLoading } from '../../components/RoleDashboard';
import { useAuth } from '../../contexts/AuthContext';

export default function CustomerDashboard() {
  const { userData } = useAuth();
  if (!userData) return <RoleDashboardLoading />;

  const base = `/customer`;
  return (
    <RoleDashboard
      emoji="🛍️"
      roleLabel="Customer Dashboard"
      subtitle="Browse fresh produce from local farmers and track your orders."
      showWallet={false}
      actions={[
        { label: 'Marketplace', icon: 'storefront', color: '#16a34a', route: `${base}/marketplace` },
        { label: 'My Orders', icon: 'receipt', color: '#3b82f6', route: `${base}/orders` },
        { label: 'Profile', icon: 'person', color: '#f59e0b', route: `${base}/profile` },
      ]}
    />
  );
}
