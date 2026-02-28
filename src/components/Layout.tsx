import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ClusterProvider } from '../hooks/useCluster';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <ClusterProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-64 p-8">
          <Outlet />
        </main>
      </div>
    </ClusterProvider>
  );
}
