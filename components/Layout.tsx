import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, FileText, Users, ShoppingCart, Truck, Settings, LogOut, Search, Bell, ChevronRight, ChevronLeft, Shield, TrendingUp, Upload } from 'lucide-react';
import { COMPANY_DETAILS, MOCK_USERS } from '../constants';


interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

interface NavItemProps {
  icon: any;
  label: string;
  id: string;
  active: string;
  onClick: (id: string) => void;
  collapsed: boolean;
}

const NavItem = ({ icon: Icon, label, id, active, onClick, collapsed }: NavItemProps) => (
  <button
    onClick={() => onClick(id)}
    title={collapsed ? label : undefined}
    className={`flex items-center w-full py-3 mb-1 text-sm font-medium transition-colors rounded-lg group ${active === id
      ? 'bg-brand-primary text-white shadow-md'
      : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-brand-primary dark:hover:text-white'
      } ${collapsed ? 'justify-center px-2' : 'px-4'}`}
  >
    <Icon className={`w-5 h-5 ${collapsed ? '' : 'mr-3'} ${active === id ? 'text-white' : 'text-slate-400 group-hover:text-brand-primary dark:group-hover:text-white'}`} />
    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // Simulated logged-in user (Admin)
  const user = MOCK_USERS.find(u => u.roles.includes('Admin')) || MOCK_USERS[0];

  useEffect(() => {
    const savedLogo = localStorage.getItem('company_logo');
    if (savedLogo) {
      setCustomLogo(savedLogo);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <Shield className="w-8 h-8 text-brand-primary" />
          )}
          <span className="font-bold text-lg text-brand-primary tracking-tight">GLOBAL HEDEF</span>
        </div>
        <button onClick={toggleSidebar} className="text-slate-600 dark:text-slate-300">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-all duration-300 ease-in-out md:translate-x-0 md:static md:h-screen sticky top-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="h-full flex flex-col relative">
          {/* Collapse Toggle Button (Desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-9 z-50 w-6 h-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full items-center justify-center text-slate-500 hover:text-brand-primary shadow-sm"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Logo Area */}
          <div className={`h-auto flex items-center justify-center border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-300 ${isCollapsed ? 'p-2' : 'px-6'}`}>
            {isCollapsed ? (
              <img
                src="/amblem.png"
                alt="Global Hedef Logo"
                className="w-12 h-12 object-contain"
              />
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight leading-none text-center">Global Hedef</h1>
                <span className="text-sm font-semibold text-brand-primary tracking-[0.3em]">SİGORTA</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto overflow-x-hidden">
            <div className="mb-6">
              {!isCollapsed && <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">MENÜ</p>}
              <NavItem id="dashboard" label="Ajanda" icon={LayoutDashboard} active={activePage} onClick={(page) => { onNavigate(page); navigate('/'); }} collapsed={isCollapsed} />
              <NavItem id="customers" label="Müşteriler" icon={Users} active={activePage} onClick={(page) => { onNavigate(page); navigate('/customers'); }} collapsed={isCollapsed} />
              <NavItem id="policies" label="Poliçeler" icon={FileText} active={activePage} onClick={(page) => { onNavigate(page); navigate('/policies'); }} collapsed={isCollapsed} />
            </div>

            <div>
              {!isCollapsed && <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">YÖNETİM</p>}
              <NavItem id="financial" label="Bilanço & Prim" icon={TrendingUp} active={activePage} onClick={(page) => { onNavigate(page); navigate('/financial'); }} collapsed={isCollapsed} />
              <NavItem id="settings" label="Ayarlar" icon={Settings} active={activePage} onClick={(page) => { onNavigate(page); navigate('/settings'); }} collapsed={isCollapsed} />
              <NavItem id="import" label="Veri Aktar" icon={Upload} active={activePage} onClick={(page) => { onNavigate(page); navigate('/import'); }} collapsed={isCollapsed} />
            </div>
          </nav>

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className={`flex items-center ${isCollapsed ? 'justify-center mb-0' : 'mb-3'}`}>
              <img src={`https://ui-avatars.com/api/?name=${user.fullName}&background=003087&color=fff`} alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-600 shadow-sm" />
              {!isCollapsed && (
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.roles.join(', ')}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button className="flex items-center justify-center w-full px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
            <span className="hidden md:inline">Hoşgeldiniz, {user.fullName}.</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => { onNavigate('dashboard'); navigate('/'); }}
              className="relative p-2 text-slate-400 hover:text-brand-primary transition-colors ring-0 focus:outline-none"
            >
              <Bell className="w-6 h-6" />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{new Date().toLocaleDateString('tr-TR')}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-6 px-8 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400">
            <div className="mb-4 md:mb-0 text-center md:text-left">
              <p className="font-semibold text-brand-primary dark:text-blue-400">{COMPANY_DETAILS.name}</p>
              <p>{COMPANY_DETAILS.address}</p>
            </div>
            <div className="text-center md:text-right">
              <p>Tel: {COMPANY_DETAILS.phone}</p>
              <p>Email: {COMPANY_DETAILS.email}</p>
              <p className="mt-2 text-xs">© {new Date().getFullYear()} Global Hedef Sigorta. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </footer>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
