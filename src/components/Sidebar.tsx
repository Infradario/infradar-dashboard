import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Shield, LogOut, Radar, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clusters', icon: Server, label: 'Clusters' },
    { to: '/security', icon: Shield, label: 'Security' },
  ];

  return (
    <aside className="w-64 bg-surface-900 border-r border-white/5 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Radar className="w-8 h-8 text-cyan-400" />
          <span className="text-xl font-bold">Infradar</span>
        </div>
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

      <div className="p-4 border-t border-white/5 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <div className="text-xs text-gray-500 mb-1 truncate px-4 pt-2">{user?.email}</div>
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
