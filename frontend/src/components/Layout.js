import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  PhoneArrowUpRightIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  UserGroupIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Logo } from './Logo';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, tenants, currentTenant, setCurrentTenant } = useAuth();
  const { settings } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      current: location.pathname === '/',
    },
    {
      name: 'Workflows',
      href: '/workflows',
      icon: WrenchScrewdriverIcon,
      current: location.pathname.startsWith('/workflows'),
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: UserGroupIcon,
      current: location.pathname === '/contacts',
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: ChatBubbleLeftRightIcon,
      current: location.pathname === '/messages',
    },
    {
      name: 'WhatsApp',
      href: '/whatsapp',
      icon: PhoneArrowUpRightIcon,
      current: location.pathname === '/whatsapp',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      current: location.pathname === '/analytics',
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: CreditCardIcon,
      current: location.pathname === '/billing',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/settings',
    },
  ];

  const handleTenantChange = (tenant) => {
    setCurrentTenant(tenant);
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar for mobile */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              navigation={navigation}
              user={user}
              tenants={tenants}
              currentTenant={currentTenant}
              settings={settings}
              onTenantChange={handleTenantChange}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent
            navigation={navigation}
            user={user}
            tenants={tenants}
            currentTenant={currentTenant}
            settings={settings}
            onTenantChange={handleTenantChange}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Top header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center space-x-2">
              {currentTenant && (
                <div className="flex items-center space-x-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {currentTenant.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

const SidebarContent = ({
  navigation,
  user,
  tenants,
  currentTenant,
  settings,
  onTenantChange,
  onLogout,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
        <Logo className="h-8 w-auto" />
        <span className="ml-2 text-xl font-semibold text-gray-900">ManyChat</span>
      </div>

      {/* Tenant Selector */}
      {tenants && tenants.length > 1 && (
        <div className="px-4 py-3 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Workspace
          </label>
          <select
            value={currentTenant?.id || ''}
            onChange={(e) => {
              const tenant = tenants.find((t) => t.id === e.target.value);
              if (tenant) onTenantChange(tenant);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-whatsapp-500 focus:border-whatsapp-500"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-link ${
                item.current ? 'nav-link-active' : 'nav-link-inactive'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* User menu */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center w-full">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-whatsapp-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0] || user?.email?.[0]}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Logo = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      fill="#25D366"
    />
  </svg>
);

export default Layout;