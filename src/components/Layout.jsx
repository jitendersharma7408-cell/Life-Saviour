import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import EmergencySos from '@/components/EmergencySos';
import AiAssistant from '@/components/AiAssistant';
import { useAuth } from '@/lib/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar role={user?.role} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
      <EmergencySos />
      <AiAssistant />
    </div>
  );
}