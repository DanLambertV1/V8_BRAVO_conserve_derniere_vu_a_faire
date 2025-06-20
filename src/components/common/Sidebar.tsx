import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  Upload,
  Bell,
  Settings,
  LogOut,
  PieChart,
  User,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadAlerts: number;
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
  { id: 'sales', label: 'Ventes', icon: ShoppingCart },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'statistics', label: 'Statistiques', icon: PieChart },
  { id: 'import', label: 'Import Données', icon: Upload },
];

const systemItems = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar({ isOpen, activeTab, onTabChange, unreadAlerts }: SidebarProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  
  const { user, logout, sessionDuration } = useAuth();

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    
    try {
      await logout();
      setLogoutSuccess(true);
      
      // Redirect after showing success message
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      alert('Erreur lors de la déconnexion. Veuillez réessayer.');
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
    setIsLoggingOut(false);
    setLogoutSuccess(false);
  };

  if (!user) return null;

  return (
    <>
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -250 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 
                   border-r border-cyan-500/20 shadow-2xl shadow-cyan-500/10 z-50"
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg 
                            flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Global VA MADA</h1>
              <p className="text-xs text-gray-400">Suivi des Ventes</p>
            </div>
          </div>

          {/* User Info Section */}
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full 
                              flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user.name}</p>
                <p className="text-gray-400 text-xs truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Session: {sessionDuration}</span>
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                {user.role}
              </span>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                             ${isActive 
                               ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30' 
                               : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                             }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-700">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2
                             ${isActive 
                               ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30' 
                               : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                             }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.id === 'notifications' && unreadAlerts > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {unreadAlerts}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <motion.button
              onClick={handleLogoutClick}
              whileHover={{ x: 4 }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 
                         hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 
                         border border-red-500/20 hover:border-red-500/40"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              {!logoutSuccess ? (
                <>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                      {isLoggingOut ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full"
                        />
                      ) : (
                        <LogOut className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {isLoggingOut ? 'Déconnexion en cours...' : 'Confirmer la déconnexion'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {isLoggingOut ? 'Nettoyage de la session...' : 'Êtes-vous sûr de vouloir vous déconnecter ?'}
                      </p>
                    </div>
                  </div>

                  {!isLoggingOut && (
                    <>
                      {/* User Session Info */}
                      <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
                        <h4 className="text-white font-medium mb-3">Informations de session</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Utilisateur:</span>
                            <span className="text-white">{user.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-white">{user.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Rôle:</span>
                            <span className="text-green-400">{user.role}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Durée de session:</span>
                            <span className="text-white">{sessionDuration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Dernière connexion:</span>
                            <span className="text-white">{user.lastLogin.toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Security Notice */}
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                          <div>
                            <h5 className="text-yellow-400 font-semibold text-sm">Sécurité</h5>
                            <p className="text-gray-300 text-xs mt-1">
                              Toutes les données de session seront effacées et vous devrez vous reconnecter 
                              pour accéder à l'application.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <button
                          onClick={handleLogoutConfirm}
                          disabled={isLoggingOut}
                          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                                     py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Confirmer la déconnexion</span>
                        </button>
                        
                        <button
                          onClick={handleLogoutCancel}
                          disabled={isLoggingOut}
                          className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                                     hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-all duration-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  )}

                  {isLoggingOut && (
                    <div className="text-center py-4">
                      <div className="space-y-2 text-sm text-gray-300">
                        <p>• Sauvegarde des données en cours...</p>
                        <p>• Nettoyage de la session...</p>
                        <p>• Fermeture sécurisée...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Success State */
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Déconnexion réussie</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Vous avez été déconnecté avec succès. Redirection en cours...
                  </p>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-center space-x-2 text-green-400 text-sm">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full"
                      />
                      <span>Redirection vers la page de connexion...</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}