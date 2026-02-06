import { Header } from '@/components/layout/Header';
import { AdminView } from '@/components/admin/AdminView';

export function AdminPage() {
  return (
    <>
      <Header title="Admin" />
      <AdminView />
    </>
  );
}
