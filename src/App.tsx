import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { AuthProvider } from './components/AuthProvider';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/Dashboard';
import { SalesModule } from './components/SalesModule';
import { StockModule } from './components/StockModule';
import { ImportModule } from './components/ImportModule';
import { StatisticsModule } from './components/StatisticsModule';
import { SettingsModule } from './components/SettingsModule';
import { NotificationsModule } from './components/NotificationsModule';
import { useFirebaseData } from './hooks/useFirebaseData';
import { useAuth } from './hooks/useAuth';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const {
    registerSales,
    products,
    dashboardStats,
    alerts,
    loading,
    addRegisterSales,
    addProduct,
    addProducts, // ✅ NEW: Batch add products
    updateProduct,
    deleteProduct,
    deleteProducts,
    deleteSales,
    markAlertAsRead,
    refreshData
  } = useFirebaseData();

  const unreadAlerts = alerts.filter(alert => !alert.read).length;

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Show login page if not authenticated or user has no role
  if (!isAuthenticated || !user || !user.role) {
    return (
      <LoginPage onLoginSuccess={() => {
        // Force a refresh to ensure user data is loaded
        window.location.reload();
      }} />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            dashboardStats={dashboardStats} 
            registerSales={registerSales}
            products={products}
            loading={loading} 
          />
        );
      case 'sales':
        return (
          <SalesModule 
            registerSales={registerSales}
            onRefreshData={refreshData}
            onDeleteSales={deleteSales}
          />
        );
      case 'stock':
        return (
          <StockModule
            products={products}
            registerSales={registerSales}
            loading={loading}
            onAddProduct={addProduct}
            onAddProducts={addProducts} // ✅ NEW: Pass batch add products
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
            onDeleteProducts={deleteProducts}
            onRefreshData={refreshData}
          />
        );
      case 'statistics':
        return (
          <StatisticsModule 
            registerSales={registerSales}
            products={products}
          />
        );
      case 'import':
        return (
          <ImportModule 
            onImportSales={addRegisterSales}
            onRefreshData={refreshData}
          />
        );
      case 'notifications':
        return <NotificationsModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return (
          <Dashboard 
            dashboardStats={dashboardStats} 
            registerSales={registerSales}
            products={products}
            loading={loading} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadAlerts={unreadAlerts}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-6'}`}>
        {/* Top Bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700 p-4"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {unreadAlerts > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                                   rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                </motion.div>
              )}

              <div className="text-right">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-gray-400 text-sm capitalize">{user.role}</p>
              </div>

              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 
                              rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Page Content */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;