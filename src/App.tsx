import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clusters from './pages/Clusters';
import NewCluster from './pages/NewCluster';
import ClusterDetail from './pages/ClusterDetail';
import Security, { SecurityDetail } from './pages/Security';
import AttackPaths from './pages/AttackPaths';
import Simulator from './pages/Simulator';
import Costs from './pages/Costs';
import BlastRadius from './pages/BlastRadius';
import Timeline from './pages/Timeline';
import ClusterMap from './pages/ClusterMap';
import Heatmap from './pages/Heatmap';
import Events from './pages/Events';
import Alerts from './pages/Alerts';
import NSCompare from './pages/NSCompare';
import GoldenSignals from './pages/GoldenSignals';

export default function App() {
  return (
    <ThemeProvider>
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
            <Route path="/clusters/:id/simulator" element={<Simulator />} />
            <Route path="/clusters/:id/costs" element={<Costs />} />
            <Route path="/clusters/:id/timeline" element={<Timeline />} />
            <Route path="/clusters/:id/topology" element={<ClusterMap />} />
            <Route path="/clusters/:id/heatmap" element={<Heatmap />} />
            <Route path="/clusters/:id/events" element={<Events />} />
            <Route path="/clusters/:id/alerts" element={<Alerts />} />
            <Route path="/clusters/:id/golden-signals" element={<GoldenSignals />} />
            <Route path="/security" element={<Security />} />
            <Route path="/security/:id" element={<SecurityDetail />} />
            <Route path="/security/:id/attack-paths" element={<AttackPaths />} />
            <Route path="/security/:id/blast-radius" element={<BlastRadius />} />
            <Route path="/security/:id/ns-compare" element={<NSCompare />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
