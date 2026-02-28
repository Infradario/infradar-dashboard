import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Shield, LogOut, Radar, Sun, Moon, Monitor, Plus, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useCluster } from '../hooks/useCluster';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { clusters, selected, selectCluster } = useCluster();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/details', icon: Server, label: 'Details' },
    { to: '/security', icon: Shield, label: 'Security' },
  ];

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'auto' as const, icon: Monitor, label: 'Auto' },
  ];

  return (
    <aside className="w-64 bg-surface-900 border-r border-white/5 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Radar className="w-8 h-8 text-cyan-400" />
          <span className="text-xl font-bold">Infradar</span>
        </div>
      </div>

      {/* Cluster Selector */}
      <div className="px-4 pt-4 pb-2">
        <label className="text-xs text-gray-500 block mb-1.5 px-1">Cluster</label>
        {clusters.length > 0 ? (
          <div className="relative">
            <select
              value={selected?.id || ''}
              onChange={(e) => selectCluster(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:border-cyan-500 transition-colors pr-8"
            >
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.provider.toUpperCase()})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <NavLink
            to="/clusters/new"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Cluster
          </NavLink>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-3">
        {/* Theme switcher */}
        <div className="flex items-center bg-surface-800 rounded-lg p-1">
          {themes.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              title={label}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                mode === value
                  ? 'bg-surface-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 truncate px-4">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
