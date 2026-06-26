import React from 'react';
import RoleDashboard, { RoleDashboardLoading } from '../../components/RoleDashboard';
import { useAuth } from '../../contexts/AuthContext';

export default function TraderDashboard() {
  const { userData } = useAuth();
  if (!userData) return <RoleDashboardLoading />;

  const base = `/trader`;
  return (
    <RoleDashboard
      emoji="👨‍💼"
      roleLabel="Trader Dashboard"
      subtitle="Buy crops from farmers, resell on the marketplace. 12.5% of resale profit goes to the original farmer."
      actions={[
        { label: 'Marketplace', icon: 'storefront', color: '#16a34a', route: `${base}/marketplace` },
        { label: 'My Orders', icon: 'receipt', color: '#3b82f6', route: `${base}/orders` },
        { label: 'Wallet', icon: 'wallet', color: '#8b5cf6', route: `${base}/wallet` },
        { label: 'Profile', icon: 'person', color: '#f59e0b', route: `${base}/profile` },
      ]}
    />
  );
}
