import React, { useState, useMemo } from 'react';
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
  CheckSquare,
  Square,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Eye,
  EyeOff
} from 'lucide-react';
import { Product, RegisterSale } from '../types';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';
import { validateStockImport, StockImportData } from '../utils/stockImportUtils';

interface StockModuleProps {
  products: Product[];
  registerSales: RegisterSale[];
  loading: boolean;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onAddProducts?: (products: Omit<Product, 'id'>[]) => Promise<boolean>; // ✅ NEW: Batch add products
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteProducts: (productIds: string[]) => Promise<boolean>;
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

export function StockModule({ 
  products, 
  registerSales, 
  loading, 
  onAddProduct, 
  onAddProducts, // ✅ NEW: Batch add products
  onUpdateProduct, 
  onDeleteProduct, 
  onDeleteProducts,
  onRefreshData 
}: StockModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // ✅ NEW: Pagination states with 30, 50, 100 options
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // ✅ NEW: Stock import states
  const [importPreview, setImportPreview] = useState<{ data: StockImportData[]; errors: any[] } | null>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    minStock: 0,
    description: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Filtrage et tri des produits
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             product.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
        
        let matchesStatus = true;
        if (filterStatus === 'low-stock') {
          matchesStatus = product.stock <= product.minStock;
        } else if (filterStatus === 'out-of-stock') {
          matchesStatus = product.stock === 0;
        } else if (filterStatus === 'in-stock') {
          matchesStatus = product.stock > product.minStock;
        }
        
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

  // ✅ NEW: Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const categories = [...new Set(products.map(p => p.category))];

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ✅ NEW: Pagination handlers
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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

  const selectAllFiltered = () => {
    setSelectedProducts(new Set(filteredProducts.map(product => product.id)));
  };

  const handleAddProduct = () => {
    if (formData.name && formData.category && formData.price >= 0 && formData.stock >= 0) {
      onAddProduct({
        name: formData.name,
        category: formData.category,
        price: formData.price,
        stock: formData.stock,
        initialStock: formData.stock,
        quantitySold: 0,
        minStock: formData.minStock,
        description: formData.description
      });
      
      setFormData({
        name: '',
        category: '',
        price: 0,
        stock: 0,
        minStock: 0,
        description: ''
      });
      setShowAddModal(false);
    }
  };

  const handleEditProduct = () => {
    if (editingProduct && formData.name && formData.category && formData.price >= 0 && formData.stock >= 0) {
      onUpdateProduct(editingProduct.id, {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        stock: formData.stock,
        minStock: formData.minStock,
        description: formData.description
      });
      
      setShowEditModal(false);
      setEditingProduct(null);
    }
  };

  const handleDeleteProducts = async () => {
    if (selectedProducts.size === 0) return;

    setIsDeleting(true);
    try {
      const success = await onDeleteProducts(Array.from(selectedProducts));
      if (success) {
        setSelectedProducts(new Set());
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('Error deleting products:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredProducts.map(product => ({
      Nom: product.name,
      Catégorie: product.category,
      Prix: product.price,
      'Stock Initial': product.initialStock || product.stock,
      'Quantité Vendue': product.quantitySold || 0,
      'Stock Actuel': product.stock,
      'Stock Minimum': product.minStock,
      Statut: product.stock <= product.minStock ? 'Stock faible' : 'En stock',
      Valeur: product.stock * product.price,
      Description: product.description || ''
    }));
    
    exportToExcel(exportData, `stock-${new Date().toISOString().split('T')[0]}`);
  };

  // ✅ NEW: Handle stock import with batch processing
  const handleStockImport = async (file: File) => {
    setIsImporting(true);
    try {
      const rawData = await importFromExcel(file);
      const validatedData = validateStockImport(rawData);
      
      if (validatedData.errors.length > 0) {
        setImportPreview(validatedData);
        setShowImportPreview(true);
        setIsImporting(false);
        return;
      }

      // Convert stock data to products
      const productsToImport: Omit<Product, 'id'>[] = validatedData.data.map(stockItem => ({
        name: stockItem.product,
        category: stockItem.category,
        price: 0, // Default price, can be updated later
        stock: stockItem.quantity,
        initialStock: stockItem.quantity,
        quantitySold: 0,
        minStock: Math.max(1, Math.floor(stockItem.quantity * 0.1)), // 10% of initial stock as minimum
        description: `Importé le ${stockItem.date.toLocaleDateString('fr-FR')}`
      }));

      // Use batch import if available
      if (onAddProducts) {
        const success = await onAddProducts(productsToImport);
        if (success) {
          alert(`${productsToImport.length} produits importés avec succès en lots de 200 !`);
          setShowImportModal(false);
        }
      } else {
        // Fallback to individual imports
        for (const product of productsToImport) {
          onAddProduct(product);
        }
        alert(`${productsToImport.length} produits importés avec succès !`);
        setShowImportModal(false);
      }
    } catch (error) {
      console.error('Error importing stock:', error);
      alert('Erreur lors de l\'importation du stock');
    } finally {
      setIsImporting(false);
    }
  };

  const confirmStockImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    try {
      // Convert stock data to products
      const productsToImport: Omit<Product, 'id'>[] = importPreview.data.map(stockItem => ({
        name: stockItem.product,
        category: stockItem.category,
        price: 0, // Default price, can be updated later
        stock: stockItem.quantity,
        initialStock: stockItem.quantity,
        quantitySold: 0,
        minStock: Math.max(1, Math.floor(stockItem.quantity * 0.1)), // 10% of initial stock as minimum
        description: `Importé le ${stockItem.date.toLocaleDateString('fr-FR')}`
      }));

      // Use batch import if available
      if (onAddProducts) {
        const success = await onAddProducts(productsToImport);
        if (success) {
          alert(`${productsToImport.length} produits importés avec succès en lots de 200 !`);
          setShowImportModal(false);
          setShowImportPreview(false);
          setImportPreview(null);
        }
      } else {
        // Fallback to individual imports
        for (const product of productsToImport) {
          onAddProduct(product);
        }
        alert(`${productsToImport.length} produits importés avec succès !`);
        setShowImportModal(false);
        setShowImportPreview(false);
        setImportPreview(null);
      }
    } catch (error) {
      console.error('Error importing stock:', error);
      alert('Erreur lors de l\'importation du stock');
    } finally {
      setIsImporting(false);
    }
  };

  const openEditModal = (product: Product) => {
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

  // Statistiques
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.stock * product.price), 0);
  const lowStockCount = products.filter(product => product.stock <= product.minStock).length;
  const outOfStockCount = products.filter(product => product.stock === 0).length;

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
          <p className="text-gray-400">Gérez votre inventaire et suivez les niveaux de stock</p>
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
            <span>Importer Stock</span>
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

      {/* Statistiques */}
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
              <p className="text-2xl font-bold text-white">{totalProducts}</p>
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
            <TrendingUp className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Valeur Stock</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
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
              <p className="text-2xl font-bold text-white">{lowStockCount}</p>
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
            <TrendingDown className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Rupture Stock</p>
              <p className="text-2xl font-bold text-white">{outOfStockCount}</p>
            </div>
          </div>
          <p className="text-red-400 text-sm">Produits épuisés</p>
        </motion.div>
      </div>

      {/* Actions de sélection multiple */}
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
              {selectedProducts.size < filteredProducts.length && (
                <button
                  onClick={selectAllFiltered}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Sélectionner tous les produits filtrés ({filteredProducts.length})
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 
                           transition-all duration-200 flex items-center space-x-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer la sélection</span>
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

      {/* Filtres */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
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
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="in-stock">En stock</option>
            <option value="low-stock">Stock faible</option>
            <option value="out-of-stock">Rupture de stock</option>
          </select>
        </div>
      </motion.div>

      {/* ✅ NEW: Pagination Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-4"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm">Affichage par page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-400 text-sm">
              {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} sur {filteredProducts.length}
            </span>
          </div>

          {totalPages > 1 && (
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
          )}
        </div>
      </motion.div>

      {/* Tableau des produits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">
            Inventaire ({filteredProducts.length} produits)
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
                  { key: 'initialStock', label: 'Stock Initial' },
                  { key: 'quantitySold', label: 'Vendu' },
                  { key: 'stock', label: 'Stock Actuel' },
                  { key: 'minStock', label: 'Min' },
                  { key: 'status', label: 'Statut' }
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left py-4 px-4 text-gray-400 font-medium cursor-pointer hover:text-white
                               transition-colors duration-200"
                    onClick={() => key !== 'status' && handleSort(key as keyof Product)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{label}</span>
                      {key !== 'status' && <ArrowUpDown className="w-4 h-4" />}
                    </div>
                  </th>
                ))}
                <th className="text-left py-4 px-4 text-gray-400 font-medium">Valeur</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, index) => {
                const isLowStock = product.stock <= product.minStock;
                const isOutOfStock = product.stock === 0;
                
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
                    <td className="py-4 px-4 text-white font-medium">{product.name}</td>
                    <td className="py-4 px-4">
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{formatCurrency(product.price)}</td>
                    <td className="py-4 px-4 text-center text-blue-400 font-medium">
                      {product.initialStock || product.stock + (product.quantitySold || 0)}
                    </td>
                    <td className="py-4 px-4 text-center text-orange-400 font-medium">
                      {product.quantitySold || 0}
                    </td>
                    <td className="py-4 px-4 text-center text-white font-medium">{product.stock}</td>
                    <td className="py-4 px-4 text-center text-gray-300">{product.minStock}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isOutOfStock 
                          ? 'bg-red-500/20 text-red-400' 
                          : isLowStock 
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                      }`}>
                        {isOutOfStock ? 'Rupture' : isLowStock ? 'Stock faible' : 'En stock'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-green-400 font-semibold">
                      {formatCurrency(product.stock * product.price)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openEditModal(product)}
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
              Aucun produit trouvé avec les filtres actuels
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal d'ajout de produit */}
      <AnimatePresence>
        {showAddModal && (
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
              <h3 className="text-lg font-semibold text-white mb-4">Ajouter un Produit</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nom du produit</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="Nom du produit"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Catégorie</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="Catégorie"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Prix (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                                 focus:outline-none focus:border-cyan-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Stock</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                                 focus:outline-none focus:border-cyan-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Stock minimum</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="Description du produit"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleAddProduct}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-cyan-600 hover:to-purple-600 
                             transition-all duration-200"
                >
                  Ajouter
                </button>
                
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                             hover:bg-gray-500 transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal d'édition de produit */}
      <AnimatePresence>
        {showEditModal && editingProduct && (
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
              <h3 className="text-lg font-semibold text-white mb-4">Modifier le Produit</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nom du produit</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="Nom du produit"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Catégorie</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="Catégorie"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Prix (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                                 focus:outline-none focus:border-cyan-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Stock</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                                 focus:outline-none focus:border-cyan-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Stock minimum</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white
                               focus:outline-none focus:border-cyan-500"
                    placeholder="Description du produit"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleEditProduct}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 
                             transition-all duration-200"
                >
                  Modifier
                </button>
                
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                             hover:bg-gray-500 transition-all duration-200"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de suppression */}
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
                <div className="text-gray-300 text-sm">
                  <div>• <strong>{selectedProducts.size}</strong> produit(s) sélectionné(s)</div>
                  <div>• Cette action supprimera définitivement les produits</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteProducts}
                  disabled={isDeleting}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                             py-3 px-4 rounded-xl hover:from-red-600 hover:to-red-700 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
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
                  disabled={isDeleting}
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

      {/* ✅ NEW: Modal d'import de stock */}
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
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Importer Stock depuis Excel</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">📋 Format requis</h4>
                  <div className="text-gray-300 text-sm space-y-1">
                    <p><strong>Colonnes obligatoires :</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>• <strong>Product</strong> (ou Produit, Article, Nom)</li>
                      <li>• <strong>Category</strong> (ou Catégorie, Type, Famille)</li>
                      <li>• <strong>Date</strong> (format DD/MM/YYYY ou YYYY-MM-DD)</li>
                      <li>• <strong>Quantity</strong> (ou Quantité, Stock, Qty)</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <h4 className="text-yellow-400 font-semibold mb-2">⚡ Import par lots de 200</h4>
                  <p className="text-gray-300 text-sm">
                    Les produits seront automatiquement importés par lots de 200 pour optimiser les performances Firebase.
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleStockImport(e.target.files[0])}
                    disabled={isImporting}
                    className="hidden"
                    id="stock-file-import"
                  />
                  <label
                    htmlFor="stock-file-import"
                    className={`cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-4 bg-blue-500/20 rounded-full">
                        {isImporting ? (
                          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {isImporting ? 'Import en cours...' : 'Cliquez pour sélectionner un fichier Excel'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Formats supportés: CSV, Excel (.xlsx, .xls)
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    disabled={isImporting}
                    className="flex-1 px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                               hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-200"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ NEW: Modal de prévisualisation d'import */}
      <AnimatePresence>
        {showImportPreview && importPreview && (
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
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Eye className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">Aperçu Import Stock</h3>
                </div>
                <button
                  onClick={() => setShowImportPreview(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {importPreview.errors.length > 0 && (
                <div className="mb-6">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">Erreurs détectées ({importPreview.errors.length})</span>
                    </div>
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
                </div>
              )}

              {importPreview.data.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">
                    Données valides ({importPreview.data.length} produits) :
                  </h4>
                  <div className="bg-gray-700/30 rounded-xl p-4 overflow-x-auto">
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
                        {importPreview.data.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-b border-gray-600/50">
                            <td className="py-2 text-white truncate max-w-32">{item.product}</td>
                            <td className="py-2 text-gray-300 truncate max-w-24">{item.category}</td>
                            <td className="py-2 text-center text-blue-400 font-medium">{item.quantity}</td>
                            <td className="py-2 text-gray-300">{item.date.toLocaleDateString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.data.length > 10 && (
                      <div className="text-center py-2 text-gray-400 text-sm">
                        ... et {importPreview.data.length - 10} autres produits
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                {importPreview.data.length > 0 && (
                  <button
                    onClick={confirmStockImport}
                    disabled={isImporting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                               py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 
                               disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                               flex items-center justify-center space-x-2"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Import en cours...</span>
                      </>
                    ) : (
                      <span>Confirmer l'Import ({importPreview.data.length} produits)</span>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => setShowImportPreview(false)}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl 
                             hover:bg-gray-500 transition-all duration-200"
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