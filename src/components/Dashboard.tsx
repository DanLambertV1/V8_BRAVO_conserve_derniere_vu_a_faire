import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle,
  ShoppingCart,
  Users,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  X,
  TrendingDown,
  RefreshCw,
  Monitor
} from 'lucide-react';
import { DashboardStats, RegisterSale, Product } from '../types';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { FirebaseSetup } from './FirebaseSetup';

interface DashboardProps {
  dashboardStats: DashboardStats | null;
  registerSales: RegisterSale[];
  products: Product[]; // ✅ Ajout des produits pour calculer les vraies alertes
  loading: boolean;
}

export function Dashboard({ dashboardStats, registerSales, products, loading }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegister, setFilterRegister] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortField, setSortField] = useState<keyof RegisterSale>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(true);
  
  // Filtres de date - par défaut mois en cours
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Filtrage par période et autres critères
  const getFilteredSales = () => {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    return registerSales.filter(sale => {
      const matchesDateRange = isAfter(sale.date, start) && isBefore(sale.date, end);
      const matchesSearch = sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegister = filterRegister === 'all' || sale.register === filterRegister;
      const matchesSeller = filterSeller === 'all' || sale.seller === filterSeller;
      const matchesCategory = filterCategory === 'all' || sale.category === filterCategory;
      
      return matchesDateRange && matchesSearch && matchesRegister && matchesSeller && matchesCategory;
    });
  };

  const filteredSalesByPeriod = getFilteredSales();

  // ✅ Calcul des vraies alertes de stock
  const lowStockProducts = useMemo(() => {
    return products.filter(product => product.stock <= product.minStock);
  }, [products]);

  // Calcul dynamique des statistiques basées sur les filtres
  const dynamicStats = useMemo(() => {
    const sales = filteredSalesByPeriod;
    
    const totalSales = sales.length;
    const totalRevenue = sales.filter(sale => sale.total >= 0).reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = Math.abs(sales.filter(sale => sale.total < 0).reduce((sum, sale) => sum + sale.total, 0));
    const totalProducts = new Set(sales.map(s => s.product)).size;
    const lowStockAlerts = lowStockProducts.length; // ✅ Vraies alertes de stock

    // Top produits dynamique
    const productStats = sales.reduce((acc, sale) => {
      if (sale.total >= 0) { // Seulement les ventes positives
        if (!acc[sale.product]) {
          acc[sale.product] = { quantity: 0, revenue: 0 };
        }
        acc[sale.product].quantity += sale.quantity;
        acc[sale.product].revenue += sale.total;
      }
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topProducts = Object.entries(productStats)
      .map(([product, stats]) => ({ product, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top vendeurs dynamique
    const sellerStats = sales.reduce((acc, sale) => {
      if (sale.total >= 0) { // Seulement les ventes positives
        if (!acc[sale.seller]) {
          acc[sale.seller] = { quantity: 0, revenue: 0 };
        }
        acc[sale.seller].quantity += sale.quantity;
        acc[sale.seller].revenue += sale.total;
      }
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topSellers = Object.entries(sellerStats)
      .map(([seller, stats]) => ({ seller, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Performance caisses dynamique
    const registerStats = sales.reduce((acc, sale) => {
      if (sale.total >= 0) { // Seulement les ventes positives
        let normalizedRegister = sale.register;
        if (sale.register.toLowerCase().includes('1') || sale.register.toLowerCase().includes('caisse1')) {
          normalizedRegister = 'Register1';
        } else if (sale.register.toLowerCase().includes('2') || sale.register.toLowerCase().includes('caisse2')) {
          normalizedRegister = 'Register2';
        }
        
        if (!acc[normalizedRegister]) {
          acc[normalizedRegister] = { quantity: 0, revenue: 0 };
        }
        acc[normalizedRegister].quantity += sale.quantity;
        acc[normalizedRegister].revenue += sale.total;
      }
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const registerPerformance = Object.entries(registerStats)
      .map(([register, stats]) => ({ register, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalSales,
      totalRevenue,
      totalExpenses,
      totalProducts,
      lowStockAlerts,
      topProducts,
      topSellers,
      registerPerformance
    };
  }, [filteredSalesByPeriod, lowStockProducts.length]);

  // Filtrage et tri des données pour le tableau
  const filteredSales = filteredSalesByPeriod
    .filter(sale => {
      const matchesSearch = sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           sale.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegister = filterRegister === 'all' || sale.register === filterRegister;
      const matchesSeller = filterSeller === 'all' || sale.seller === filterSeller;
      const matchesCategory = filterCategory === 'all' || sale.category === filterCategory;
      
      return matchesSearch && matchesRegister && matchesSeller && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const registers = [...new Set(registerSales.map(s => s.register))];
  const sellers = [...new Set(registerSales.map(s => s.seller))];
  const categories = [...new Set(registerSales.map(s => s.category))];

  const handleSort = (field: keyof RegisterSale) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Vérifier si des filtres sont appliqués
  const hasActiveFilters = searchTerm || filterRegister !== 'all' || filterSeller !== 'all' || filterCategory !== 'all' ||
    startDate !== format(startOfMonth(new Date()), 'yyyy-MM-dd') ||
    endDate !== format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterRegister('all');
    setFilterSeller('all');
    setFilterCategory('all');
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Tableau de Bord Global VA MADA</h1>
        <p className="text-gray-400">Vue d'ensemble des performances de vos caisses</p>
      </div>

      {/* Firebase Setup Section */}
      {showFirebaseSetup && (
        <div className="relative">
          <FirebaseSetup />
          <button
            onClick={() => setShowFirebaseSetup(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filtres de période et critères */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Filtres Dashboard</h3>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white 
                         bg-gray-700/50 hover:bg-gray-700 px-3 py-2 rounded-lg transition-all duration-200"
            >
              <X className="w-4 h-4" />
              <span>Effacer tous les filtres</span>
            </button>
          )}
        </div>
        
        {/* Période */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Autres filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                         placeholder-gray-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <select
            value={filterRegister}
            onChange={(e) => setFilterRegister(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Toutes les caisses</option>
            {registers.map(register => (
              <option key={register} value={register}>{register}</option>
            ))}
          </select>
          
          <select
            value={filterSeller}
            onChange={(e) => setFilterSeller(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tous les vendeurs</option>
            {sellers.map(seller => (
              <option key={seller} value={seller}>{seller}</option>
            ))}
          </select>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Indicateur de filtres actifs */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl"
          >
            <div className="flex items-center space-x-2 text-cyan-400 text-sm">
              <Filter className="w-4 h-4" />
              <span>Filtres actifs - Affichage de {filteredSalesByPeriod.length} ventes sur {registerSales.length} total</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Statistiques principales avec séparation ventes/dépenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 backdrop-blur-xl 
                     border border-cyan-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <ShoppingCart className="w-8 h-8 text-cyan-400" />
            <div>
              <p className="text-gray-400 text-sm">Total Ventes</p>
              <p className="text-2xl font-bold text-white">{dynamicStats.totalSales}</p>
            </div>
          </div>
          <p className="text-cyan-400 text-sm">Période filtrée</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl 
                     border border-green-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dynamicStats.totalRevenue)}</p>
            </div>
          </div>
          <p className="text-green-400 text-sm">Ventes positives uniquement</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 backdrop-blur-xl 
                     border border-pink-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <TrendingDown className="w-8 h-8 text-pink-400" />
            <div>
              <p className="text-gray-400 text-sm">Dépenses / Remboursements</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(dynamicStats.totalExpenses)}</p>
            </div>
          </div>
          <p className="text-pink-400 text-sm">Montants négatifs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl 
                     border border-purple-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <Package className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-gray-400 text-sm">Produits Vendus</p>
              <p className="text-2xl font-bold text-white">{dynamicStats.totalProducts}</p>
            </div>
          </div>
          <p className="text-purple-400 text-sm">Différents articles</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-xl 
                     border border-red-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Alertes Stock</p>
              <p className="text-2xl font-bold text-white">{dynamicStats.lowStockAlerts}</p>
            </div>
          </div>
          <p className="text-red-400 text-sm">
            {dynamicStats.lowStockAlerts === 0 ? 'Aucun produit en alerte' : 'Produits en alerte'}
          </p>
        </motion.div>
      </div>

      {/* ✅ Section détaillée des alertes de stock */}
      {lowStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl 
                     border border-red-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-white">
              Produits en Alerte de Stock ({lowStockProducts.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium truncate">{product.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.stock === 0 
                      ? 'bg-red-500/30 text-red-300' 
                      : 'bg-orange-500/30 text-orange-300'
                  }`}>
                    {product.stock === 0 ? 'Rupture' : 'Stock faible'}
                  </span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Stock actuel:</span>
                    <span className="text-red-400 font-bold">{product.stock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock minimum:</span>
                    <span className="text-gray-400">{product.minStock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Catégorie:</span>
                    <span className="text-gray-400">{product.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top performers dynamiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Produits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span>Top Produits</span>
            {hasActiveFilters && (
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
                Filtré
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {dynamicStats.topProducts.length > 0 ? (
              dynamicStats.topProducts.map((product, index) => (
                <div key={product.product} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg 
                                    flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{product.product}</p>
                      <p className="text-gray-400 text-sm">{product.quantity} vendus</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-semibold">{formatCurrency(product.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun produit trouvé</p>
                <p className="text-sm">avec les filtres actuels</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Vendeurs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Top Vendeurs</span>
            {hasActiveFilters && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                Filtré
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {dynamicStats.topSellers.length > 0 ? (
              dynamicStats.topSellers.map((seller, index) => (
                <div key={seller.seller} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg 
                                    flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{seller.seller}</p>
                      <p className="text-gray-400 text-sm">{seller.quantity} ventes</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-semibold">{formatCurrency(seller.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun vendeur trouvé</p>
                <p className="text-sm">avec les filtres actuels</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Performance Caisses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            <span>Performance Caisses</span>
            {hasActiveFilters && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                Filtré
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {dynamicStats.registerPerformance.length > 0 ? (
              dynamicStats.registerPerformance.map((register, index) => (
                <div key={register.register} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg 
                                    flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{register.register}</p>
                      <p className="text-gray-400 text-sm">{register.quantity} articles</p>
                    </div>
                  </div>
                  <p className="text-green-400 font-semibold">{formatCurrency(register.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune caisse trouvée</p>
                <p className="text-sm">avec les filtres actuels</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tableau des ventes détaillées */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <h3 className="text-lg font-semibold text-white">Détail des Ventes</h3>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                {[
                  { key: 'product', label: 'Produit' },
                  { key: 'category', label: 'Catégorie' },
                  { key: 'register', label: 'Caisse' },
                  { key: 'date', label: 'Date' },
                  { key: 'seller', label: 'Vendeur' },
                  { key: 'quantity', label: 'Quantité' },
                  { key: 'price', label: 'Montant Unit.' },
                  { key: 'total', label: 'Total' }
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white
                               transition-colors duration-200"
                    onClick={() => handleSort(key as keyof RegisterSale)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{label}</span>
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSales.slice(0, 50).map((sale, index) => (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors duration-200"
                >
                  <td className="py-3 px-4 text-white font-medium">{sale.product}</td>
                  <td className="py-3 px-4 text-gray-300">{sale.category}</td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                      {sale.register}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {format(sale.date, 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{sale.seller}</td>
                  <td className="py-3 px-4 text-center text-white font-medium">{sale.quantity}</td>
                  <td className="py-3 px-4 text-gray-300">{formatCurrency(sale.price)}</td>
                  <td className={`py-3 px-4 font-semibold ${sale.total >= 0 ? 'text-green-400' : 'text-pink-400'}`}>
                    {formatCurrency(sale.total)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredSales.length > 50 && (
            <div className="text-center py-4 text-gray-400">
              Affichage de 50 résultats sur {filteredSales.length}
            </div>
          )}

          {filteredSales.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune vente trouvée</p>
              <p className="text-sm">avec les filtres actuels</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}