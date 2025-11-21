import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calculator, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChartBig, 
  PieChart,
  ShoppingBag,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Définition des liens avec les rôles autorisés
  const navItems = [
    { name: 'Tableau de Bord', path: '/', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'employee'] },
    { name: 'Vendre', path: '/sales', icon: <Calculator size={20} />, roles: ['admin', 'manager', 'employee'] },
    { name: 'Articles', path: '/products', icon: <Package size={20} />, roles: ['admin', 'manager'] },
    { name: 'Clients', path: '/customers', icon: <Users size={20} />, roles: ['admin', 'manager'] },
    { name: 'Rapport Ventes', path: '/orders', icon: <ShoppingCart size={20} />, roles: ['admin', 'manager', 'employee'] },
    { name: 'Autres Rapports', path: '/reports', icon: <BarChartBig size={20} />, roles: ['admin', 'manager'] },
    { name: 'Historique Stock', path: '/stock-history', icon: <PieChart size={20} />, roles: ['admin', 'manager'] },
  { name: 'Taux de change', path: '/exchangeRates', icon: <Rate size={20} />, roles: ['admin', 'manager'] },
  ];

  // Filtrage des liens selon le rôle de l'utilisateur
  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out md:relative md:z-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-semibold text-gray-800">RBG - POS</span>
            </div>
            <button 
              onClick={toggleSidebar} 
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
           {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={toggleSidebar} // Ferme le sidebar après le clic
                className={({ isActive }) => 
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span className={`mr-3 ${
                  location.pathname === item.path ? 'text-primary-500' : 'text-gray-500'
                }`}>
                  {item.icon}
                </span>
                {item.name}
              </NavLink>
))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="flex items-center mb-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>

            <Link
              to="/settings"
               onClick={toggleSidebar}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Settings size={18} className="mr-2" />
             
              Paramètres
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;