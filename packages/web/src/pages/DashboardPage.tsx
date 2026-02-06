import { Header } from '@/components/layout/Header';
import { DashboardView } from '@/components/dashboard/DashboardView';

export function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <DashboardView />
    </>
  );
}
