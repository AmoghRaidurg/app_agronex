import React from 'react';
import RoleDashboard, { RoleDashboardLoading } from '../../components/RoleDashboard';
import { useAuth } from '../../contexts/AuthContext';

export default function IndustrialistDashboard() {
  const { userData } = useAuth();
  if (!userData) return <RoleDashboardLoading />;

  const base = `/industrialist`;
  return (
    <RoleDashboard
      emoji="🏭"
      roleLabel="Industrialist Dashboard"
      subtitle="Source raw materials in bulk from farmers and traders for your processing operations."
      actions={[
        { label: 'Marketplace', icon: 'storefront', color: '#16a34a', route: `${base}/marketplace` },
        { label: 'My Orders', icon: 'receipt', color: '#3b82f6', route: `${base}/orders` },
        { label: 'Wallet', icon: 'wallet', color: '#8b5cf6', route: `${base}/wallet` },
        { label: 'Profile', icon: 'person', color: '#f59e0b', route: `${base}/profile` },
      ]}
    />
  );
}
