import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  ArrowUpDown,
  Package,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  FileSpreadsheet,
  BarChart3,
  ShoppingCart,
  Calendar,
  DollarSign,
  Hash,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Zap,
  Target,
  Activity
} from 'lucide-react';
import { Product, RegisterSale } from '../types';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';
import { validateStockImport, StockImportData } from '../utils/stockImportUtils';

interface StockModuleProps {
  products: Product[];
  registerSales: RegisterSale[];
  loading: boolean;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onAddProducts: (products: Omit<Product, 'id'>[]) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteProducts: (productIds: string[]) => void;
  onRefreshData: () => void;
}

interface ProductFormData {
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  description: string;
}

interface StockImportPreview {
  data: StockImportData[];
  errors: { row: number; field: string; message: string }[];
}

export function StockModule({ 
  products, 
  registerSales, 
  loading, 
  onAddProduct, 
  onAddProducts,
  onUpdateProduct, 
  onDeleteProduct,
  onDeleteProducts,
  onRefreshData 
}: StockModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'analytics'>('overview');
  
  // Form states
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    minStock: 0,
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<ProductFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<StockImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Enhanced product analytics
  const productAnalytics = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.stock * product.price), 0);
    const lowStockProducts = products.filter(product => product.stock <= product.minStock);
    const outOfStockProducts = products.filter(product => product.stock === 0);
    const inStockProducts = products.filter(product => product.stock > product.minStock);
    
    // Calculate sales performance for each product
    const productSalesMap = new Map<string, { quantity: number; revenue: number; lastSale: Date | null }>();
    
    registerSales.forEach(sale => {
      const productKey = sale.product.toLowerCase().trim();
      const existing = productSalesMap.get(productKey);
      
      if (existing) {
        existing.quantity += sale.quantity;
        existing.revenue += sale.total;
        if (!existing.lastSale || sale.date > existing.lastSale) {
          existing.lastSale = sale.date;
        }
      } else {
        productSalesMap.set(productKey, {
          quantity: sale.quantity,
          revenue: sale.total,
          lastSale: sale.date
        });
      }
    });

    // Top performing products
    const topPerformers = products
      .map(product => {
        const salesData = productSalesMap.get(product.name.toLowerCase().trim());
        return {
          ...product,
          salesQuantity: salesData?.quantity || 0,
          salesRevenue: salesData?.revenue || 0,
          lastSale: salesData?.lastSale || null,
          turnoverRate: product.stock > 0 ? (salesData?.quantity || 0) / product.stock : 0
        };
      })
      .sort((a, b) => b.salesRevenue - a.salesRevenue)
      .slice(0, 10);

    // Categories analysis
    const categoryStats = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          count: 0,
          totalValue: 0,
          lowStock: 0,
          outOfStock: 0
        };
      }
      
      acc[product.category].count++;
      acc[product.category].totalValue += product.stock * product.price;
      
      if (product.stock === 0) {
        acc[product.category].outOfStock++;
      } else if (product.stock <= product.minStock) {
        acc[product.category].lowStock++;
      }
      
      return acc;
    }, {} as Record<string, { count: number; totalValue: number; lowStock: number; outOfStock: number }>);

    return {
      totalProducts,
      totalValue,
      lowStockProducts,
      outOfStockProducts,
      inStockProducts,
      topPerformers,
      categoryStats,
      stockTurnover: totalProducts > 0 ? (registerSales.length / totalProducts) : 0
    };
  }, [products, registerSales]);

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category))];

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             product.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
        
        const matchesStatus = filterStatus === 'all' ||
          (filterStatus === 'in-stock' && product.stock > product.minStock) ||
          (filterStatus === 'low-stock' && product.stock <= product.minStock && product.stock > 0) ||
          (filterStatus === 'out-of-stock' && product.stock === 0);
        
        return matchesSearch && matchesCategory && matchesStatus;
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
  }, [products, searchTerm, filterCategory, filterStatus, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<ProductFormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Le nom du produit est requis';
    }
    
    if (!formData.category.trim()) {
      errors.category = 'La catégorie est requise';
    }
    
    if (formData.price <= 0) {
      errors.price = 'Le prix doit être supérieur à 0';
    }
    
    if (formData.stock < 0) {
      errors.stock = 'Le stock ne peut pas être négatif';
    }
    
    if (formData.minStock < 0) {
      errors.minStock = 'Le stock minimum ne peut pas être négatif';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, {
          name: formData.name.trim(),
          category: formData.category.trim(),
          price: formData.price,
          stock: formData.stock,
          minStock: formData.minStock,
          description: formData.description.trim()
        });
        setShowEditModal(false);
      } else {
        await onAddProduct({
          name: formData.name.trim(),
          category: formData.category.trim(),
          price: formData.price,
          stock: formData.stock,
          minStock: formData.minStock,
          description: formData.description.trim()
        });
        setShowAddModal(false);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: 0,
      stock: 0,
      minStock: 0,
      description: ''
    });
    setFormErrors({});
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      description: product.description || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (selectedProducts.size === 0) return;
    
    setIsSubmitting(true);
    
    try {
      if (selectedProducts.size === 1) {
        await onDeleteProduct(Array.from(selectedProducts)[0]);
      } else {
        await onDeleteProducts(Array.from(selectedProducts));
      }
      
      setSelectedProducts(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting products:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredProducts.map(product => ({
      'Nom': product.name,
      'Catégorie': product.category,
      'Prix': product.price,
      'Stock': product.stock,
      'Stock Min': product.minStock,
      'Valeur Stock': product.stock * product.price,
      'Description': product.description || ''
    }));
    
    exportToExcel(exportData, `stock-${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    
    try {
      const rawData = await importFromExcel(file);
      const preview = validateStockImport(rawData);
      setImportPreview(preview);
    } catch (error) {
      console.error('Import error:', error);
      alert('Erreur lors de l\'importation du fichier');
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || importPreview.data.length === 0) return;
    
    setIsImporting(true);
    
    try {
      const productsToAdd = importPreview.data.map(item => ({
        name: item.product,
        category: item.category,
        price: 0, // Will need to be set manually
        stock: item.quantity,
        minStock: Math.floor(item.quantity * 0.2), // Default to 20% of initial stock
        description: `Importé le ${item.date.toLocaleDateString('fr-FR')}`
      }));
      
      await onAddProducts(productsToAdd);
      setShowImportModal(false);
      setImportPreview(null);
      setImportFile(null);
    } catch (error) {
      console.error('Import error:', error);
      alert('Erreur lors de l\'importation des produits');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map(product => product.id)));
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { status: 'out-of-stock', label: 'Rupture', color: 'text-red-400 bg-red-500/20' };
    } else if (product.stock <= product.minStock) {
      return { status: 'low-stock', label: 'Stock faible', color: 'text-yellow-400 bg-yellow-500/20' };
    } else {
      return { status: 'in-stock', label: 'En stock', color: 'text-green-400 bg-green-500/20' };
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'analytics', label: 'Analyses', icon: Activity }
  ];

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gestion du Stock</h1>
          <p className="text-gray-400">Gérez votre inventaire et suivez les performances</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onRefreshData}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Actualiser</span>
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Importer</span>
          </button>
          
          <button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Exporter</span>
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-purple-600 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Produit</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <div className="flex space-x-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 backdrop-blur-xl 
                             border border-cyan-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Package className="w-8 h-8 text-cyan-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Total Produits</p>
                      <p className="text-2xl font-bold text-white">{productAnalytics.totalProducts}</p>
                    </div>
                  </div>
                  <p className="text-cyan-400 text-sm">Articles en inventaire</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl 
                             border border-green-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <DollarSign className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Valeur Stock</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(productAnalytics.totalValue)}</p>
                    </div>
                  </div>
                  <p className="text-green-400 text-sm">Valeur totale inventaire</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-xl 
                             border border-yellow-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Stock Faible</p>
                      <p className="text-2xl font-bold text-white">{productAnalytics.lowStockProducts.length}</p>
                    </div>
                  </div>
                  <p className="text-yellow-400 text-sm">Produits à réapprovisionner</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-xl 
                             border border-red-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <X className="w-8 h-8 text-red-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Rupture Stock</p>
                      <p className="text-2xl font-bold text-white">{productAnalytics.outOfStockProducts.length}</p>
                    </div>
                  </div>
                  <p className="text-red-400 text-sm">Produits épuisés</p>
                </motion.div>
              </div>

              {/* Stock Alerts */}
              {productAnalytics.lowStockProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl 
                             border border-red-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">Alertes de Stock</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {productAnalytics.lowStockProducts.slice(0, 6).map((product) => (
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
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {productAnalytics.lowStockProducts.length > 6 && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => {
                          setActiveTab('products');
                          setFilterStatus('low-stock');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                      >
                        Voir tous les {productAnalytics.lowStockProducts.length} produits en alerte
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Category Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Aperçu par Catégorie</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-400 font-medium">Catégorie</th>
                        <th className="text-center py-3 px-2 text-gray-400 font-medium">Produits</th>
                        <th className="text-right py-3 px-2 text-gray-400 font-medium">Valeur</th>
                        <th className="text-center py-3 px-2 text-gray-400 font-medium">Stock Faible</th>
                        <th className="text-center py-3 px-2 text-gray-400 font-medium">Rupture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(productAnalytics.categoryStats).map(([category, stats]) => (
                        <tr key={category} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                          <td className="py-3 px-2 text-white font-medium">{category}</td>
                          <td className="py-3 px-2 text-center text-white">{stats.count}</td>
                          <td className="py-3 px-2 text-right text-green-400 font-semibold">
                            {formatCurrency(stats.totalValue)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {stats.lowStock > 0 ? (
                              <span className="text-yellow-400 font-medium">{stats.lowStock}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {stats.outOfStock > 0 ? (
                              <span className="text-red-400 font-medium">{stats.outOfStock}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Selection Actions */}
              {selectedProducts.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl 
                             border border-red-500/30 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckSquare className="w-5 h-5 text-red-400" />
                      <span className="text-white font-medium">
                        {selectedProducts.size} produit(s) sélectionné(s)
                      </span>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 
                                   transition-all duration-200 flex items-center space-x-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Supprimer</span>
                      </button>
                      
                      <button
                        onClick={() => setSelectedProducts(new Set())}
                        className="bg-gray-500/20 text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-500/30 
                                   transition-all duration-200 text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Filters */}
              <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Filter className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Filtres</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="in-stock">En stock</option>
                    <option value="low-stock">Stock faible</option>
                    <option value="out-of-stock">Rupture de stock</option>
                  </select>
                  
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                  >
                    <option value={25}>25 par page</option>
                    <option value={50}>50 par page</option>
                    <option value={100}>100 par page</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    Produits ({filteredProducts.length} résultats)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-4 px-4">
                          <button
                            onClick={toggleSelectAll}
                            className="text-gray-400 hover:text-white transition-colors duration-200"
                          >
                            {selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0 ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </th>
                        {[
                          { key: 'name', label: 'Produit' },
                          { key: 'category', label: 'Catégorie' },
                          { key: 'price', label: 'Prix' },
                          { key: 'stock', label: 'Stock' },
                          { key: 'minStock', label: 'Stock Min' },
                          { key: 'quantitySold', label: 'Vendus' }
                        ].map(({ key, label }) => (
                          <th
                            key={key}
                            className="text-left py-4 px-4 text-gray-400 font-medium cursor-pointer hover:text-white
                                       transition-colors duration-200"
                            onClick={() => handleSort(key as keyof Product)}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{label}</span>
                              <ArrowUpDown className="w-4 h-4" />
                            </div>
                          </th>
                        ))}
                        <th className="text-left py-4 px-4 text-gray-400 font-medium">Statut</th>
                        <th className="text-left py-4 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product, index) => {
                        const stockStatus = getStockStatus(product);
                        
                        return (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.01 }}
                            className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors duration-200 ${
                              selectedProducts.has(product.id) ? 'bg-cyan-500/10' : ''
                            }`}
                          >
                            <td className="py-4 px-4">
                              <button
                                onClick={() => toggleSelectProduct(product.id)}
                                className="text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                              >
                                {selectedProducts.has(product.id) ? (
                                  <CheckSquare className="w-5 h-5 text-cyan-400" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <div>
                                <div className="text-white font-medium">{product.name}</div>
                                {product.description && (
                                  <div className="text-gray-400 text-sm truncate max-w-xs">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium">
                                {product.category}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-white font-medium">{formatCurrency(product.price)}</td>
                            <td className="py-4 px-4 text-center">
                              <span className={`font-bold ${
                                product.stock === 0 ? 'text-red-400' :
                                product.stock <= product.minStock ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center text-gray-300">{product.minStock}</td>
                            <td className="py-4 px-4 text-center text-blue-400 font-medium">
                              {product.quantitySold || 0}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                {stockStatus.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 
                                             transition-all duration-200"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProducts(new Set([product.id]));
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 
                                             transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun produit trouvé</p>
                      <p className="text-sm">avec les filtres actuels</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                    <div className="text-gray-400 text-sm">
                      {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                currentPage === pageNum
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Top Performers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span>Top Produits par Ventes</span>
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-2 text-gray-400 font-medium">#</th>
                        <th className="text-left py-3 px-2 text-gray-400 font-medium">Produit</th>
                        <th className="text-left py-3 px-2 text-gray-400 font-medium">Catégorie</th>
                        <th className="text-center py-3 px-2 text-gray-400 font-medium">Stock</th>
                        <th className="text-center py-3 px-2 text-gray-400 font-medium">Vendus</th>
                        <th className="text-right py-3 px-2 text-gray-400 font-medium">CA Généré</th>
                        <th className="text-center py-3 px-2 text-gray-400 font-medium">Rotation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAnalytics.topPerformers.map((product, index) => (
                        <tr key={product.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                          <td className="py-3 px-2 text-cyan-400 font-bold">{index + 1}</td>
                          <td className="py-3 px-2 text-white font-medium">{product.name}</td>
                          <td className="py-3 px-2 text-gray-300">{product.category}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`font-medium ${
                              product.stock === 0 ? 'text-red-400' :
                              product.stock <= product.minStock ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center text-blue-400 font-medium">
                            {product.salesQuantity}
                          </td>
                          <td className="py-3 px-2 text-right text-green-400 font-semibold">
                            {formatCurrency(product.salesRevenue)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.turnoverRate > 2 ? 'bg-green-500/20 text-green-400' :
                              product.turnoverRate > 1 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {product.turnoverRate.toFixed(1)}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Stock Movement Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span>Analyse des Mouvements de Stock</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">📈 Rotation Moyenne</h4>
                    <p className="text-2xl font-bold text-white mb-1">
                      {productAnalytics.stockTurnover.toFixed(1)}x
                    </p>
                    <p className="text-gray-300 text-sm">Ventes par produit</p>
                  </div>
                  
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <h4 className="text-green-400 font-semibold mb-2">✅ Produits Performants</h4>
                    <p className="text-2xl font-bold text-white mb-1">
                      {productAnalytics.topPerformers.filter(p => p.turnoverRate > 1).length}
                    </p>
                    <p className="text-gray-300 text-sm">Rotation > 1x</p>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <h4 className="text-red-400 font-semibold mb-2">⚠️ Produits Lents</h4>
                    <p className="text-2xl font-bold text-white mb-1">
                      {productAnalytics.topPerformers.filter(p => p.turnoverRate < 0.5).length}
                    </p>
                    <p className="text-gray-300 text-sm">Rotation < 0.5x</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                               placeholder-gray-400 focus:outline-none focus:border-cyan-500 ${
                                 formErrors.name ? 'border-red-500' : 'border-gray-600'
                               }`}
                    placeholder="Nom du produit"
                  />
                  {formErrors.name && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Catégorie *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    list="categories"
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                               placeholder-gray-400 focus:outline-none focus:border-cyan-500 ${
                                 formErrors.category ? 'border-red-500' : 'border-gray-600'
                               }`}
                    placeholder="Catégorie du produit"
                  />
                  <datalist id="categories">
                    {categories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  {formErrors.category && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.category}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Prix *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                                 placeholder-gray-400 focus:outline-none focus:border-cyan-500 ${
                                   formErrors.price ? 'border-red-500' : 'border-gray-600'
                                 }`}
                      placeholder="0.00"
                    />
                    {formErrors.price && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                                 placeholder-gray-400 focus:outline-none focus:border-cyan-500 ${
                                   formErrors.stock ? 'border-red-500' : 'border-gray-600'
                                 }`}
                      placeholder="0"
                    />
                    {formErrors.stock && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.stock}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Stock minimum *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white
                               placeholder-gray-400 focus:outline-none focus:border-cyan-500 ${
                                 formErrors.minStock ? 'border-red-500' : 'border-gray-600'
                               }`}
                    placeholder="0"
                  />
                  {formErrors.minStock && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.minStock}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               placeholder-gray-400 focus:outline-none focus:border-cyan-500 resize-none"
                    placeholder="Description du produit (optionnel)"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold 
                               py-3 px-4 rounded-xl hover:from-cyan-600 hover:to-purple-600 
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>{editingProduct ? 'Modifier' : 'Ajouter'}</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                               hover:bg-gray-500 transition-all duration-200"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Importer des Produits</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview(null);
                    setImportFile(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!importPreview ? (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
                      disabled={isImporting}
                      className="hidden"
                      id="file-import"
                    />
                    <label
                      htmlFor="file-import"
                      className={`cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className="p-4 bg-purple-500/20 rounded-full">
                          <Upload className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {isImporting ? 'Traitement en cours...' : 'Cliquez pour sélectionner un fichier'}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Formats supportés: CSV, Excel (.xlsx, .xls)
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="bg-gray-700/30 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-2">Format requis :</h4>
                    <div className="text-gray-400 text-sm space-y-1">
                      <p><strong>Colonnes obligatoires :</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>• Product (nom du produit)</li>
                        <li>• Category (catégorie)</li>
                        <li>• Date (date d'inventaire)</li>
                        <li>• Quantity (quantité en stock)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">Aperçu de l'import</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Produits à importer:</span>
                        <span className="text-white font-bold ml-2">{importPreview.data.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Erreurs détectées:</span>
                        <span className={`font-bold ml-2 ${importPreview.errors.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {importPreview.errors.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                      <h4 className="text-red-400 font-semibold mb-2">Erreurs détectées</h4>
                      <div className="max-h-40 overflow-y-auto">
                        {importPreview.errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm text-red-300 mb-1">
                            Ligne {error.row}: {error.message}
                          </div>
                        ))}
                        {importPreview.errors.length > 5 && (
                          <div className="text-sm text-red-400 mt-2">
                            ... et {importPreview.errors.length - 5} autres erreurs
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {importPreview.data.length > 0 && (
                    <div className="bg-gray-700/30 rounded-xl p-4">
                      <h4 className="text-white font-medium mb-3">
                        Aperçu des données (premiers 5 éléments) :
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="text-left py-2 text-gray-400">Produit</th>
                              <th className="text-left py-2 text-gray-400">Catégorie</th>
                              <th className="text-center py-2 text-gray-400">Quantité</th>
                              <th className="text-left py-2 text-gray-400">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.data.slice(0, 5).map((item, index) => (
                              <tr key={index} className="border-b border-gray-600/50">
                                <td className="py-2 text-white">{item.product}</td>
                                <td className="py-2 text-gray-300">{item.category}</td>
                                <td className="py-2 text-center text-blue-400">{item.quantity}</td>
                                <td className="py-2 text-gray-300">{item.date.toLocaleDateString('fr-FR')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={confirmImport}
                      disabled={importPreview.data.length === 0 || isImporting}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                                 py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                                 flex items-center justify-center space-x-2"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Importation...</span>
                        </>
                      ) : (
                        <span>Confirmer l'Import ({importPreview.data.length} produits)</span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setImportPreview(null);
                        setImportFile(null);
                      }}
                      className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                                 hover:bg-gray-500 transition-all duration-200"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmer la suppression</h3>
                  <p className="text-gray-400 text-sm">Cette action est irréversible</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <h4 className="text-red-400 font-semibold mb-2">Produits à supprimer :</h4>
                <div className="text-gray-300 text-sm space-y-1">
                  <div>• <strong>{selectedProducts.size}</strong> produit(s) sélectionné(s)</div>
                  <div>• Valeur totale : <strong>{formatCurrency(
                    Array.from(selectedProducts).reduce((sum, id) => {
                      const product = products.find(p => p.id === id);
                      return sum + (product ? product.stock * product.price : 0);
                    }, 0)
                  )}</strong></div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmer la suppression</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                             hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}