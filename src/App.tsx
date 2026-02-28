import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clusters from './pages/Clusters';
import NewCluster from './pages/NewCluster';
import ClusterDetail from './pages/ClusterDetail';
import Security from './pages/Security';
import AttackPaths from './pages/AttackPaths';
import Simulator from './pages/Simulator';
import Costs from './pages/Costs';
import BlastRadius from './pages/BlastRadius';
import Timeline from './pages/Timeline';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/clusters/new" element={<NewCluster />} />
            <Route path="/clusters/:id" element={<ClusterDetail />} />
            <Route path="/clusters/:id/attack-paths" element={<AttackPaths />} />
            <Route path="/clusters/:id/simulator" element={<Simulator />} />
            <Route path="/clusters/:id/costs" element={<Costs />} />
            <Route path="/clusters/:id/blast-radius" element={<BlastRadius />} />
            <Route path="/clusters/:id/timeline" element={<Timeline />} />
            <Route path="/security" element={<Security />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
