import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS, FirestoreRegisterSale, FirestoreProduct } from '../lib/firebase';
import { RegisterSale, Product, DashboardStats, Alert } from '../types';
import { format, subDays, parseISO } from 'date-fns';

export function useFirebaseData() {
  const [registerSales, setRegisterSales] = useState<RegisterSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate product quantities whenever sales change
  useEffect(() => {
    if (registerSales.length > 0 && products.length > 0) {
      recalculateProductQuantities();
    }
  }, [registerSales.length]); // Only trigger when sales count changes

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRegisterSales(),
        loadProducts()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisterSales = async () => {
    try {
      const salesCollection = collection(db, COLLECTIONS.REGISTER_SALES);
      const salesQuery = query(salesCollection, orderBy('date', 'desc'));
      
      const querySnapshot = await getDocs(salesQuery);
      const sales: RegisterSale[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreRegisterSale;
        sales.push({
          id: doc.id,
          product: data.product,
          category: data.category,
          register: data.register,
          date: parseISO(data.date),
          seller: data.seller,
          quantity: data.quantity,
          price: data.price,
          total: data.total,
          created_at: data.createdAt ? parseISO(data.createdAt) : new Date()
        });
      });

      setRegisterSales(sales);
      calculateDashboardStats(sales);
    } catch (error) {
      console.error('Erreur lors du chargement des ventes:', error);
      // Fallback to mock data
      const mockSales = generateMockSales();
      setRegisterSales(mockSales);
      calculateDashboardStats(mockSales);
    }
  };

  const loadProducts = async () => {
    try {
      const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
      const productsQuery = query(productsCollection, orderBy('name'));
      
      const querySnapshot = await getDocs(productsQuery);
      const products: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreProduct;
        products.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          price: data.price,
          stock: data.stock,
          initialStock: data.initialStock || data.stock,
          quantitySold: data.quantitySold || 0,
          minStock: data.minStock,
          description: data.description
        });
      });

      setProducts(products);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts(generateMockProducts());
    }
  };

  // Enhanced product matching function
  const normalizeProductName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\w\s]/g, '') // Remove special characters except spaces
      .replace(/\b(100s?|20s?|25s?)\b/g, '') // Remove common suffixes like 100S, 20, 25
      .trim();
  };

  const findMatchingProduct = (saleName: string, saleCategory: string, products: Product[]): Product | null => {
    const normalizedSaleName = normalizeProductName(saleName);
    const normalizedSaleCategory = saleCategory.toLowerCase().trim();

    // Try exact match first
    let match = products.find(product => 
      normalizeProductName(product.name) === normalizedSaleName &&
      product.category.toLowerCase().trim() === normalizedSaleCategory
    );

    if (match) return match;

    // Try partial match on product name with same category
    match = products.find(product => {
      const normalizedProductName = normalizeProductName(product.name);
      const normalizedProductCategory = product.category.toLowerCase().trim();
      
      return (
        normalizedProductCategory === normalizedSaleCategory &&
        (normalizedProductName.includes(normalizedSaleName) || 
         normalizedSaleName.includes(normalizedProductName))
      );
    });

    if (match) return match;

    // Try fuzzy match - check if main words are present
    match = products.find(product => {
      const normalizedProductName = normalizeProductName(product.name);
      const normalizedProductCategory = product.category.toLowerCase().trim();
      
      if (normalizedProductCategory !== normalizedSaleCategory) return false;
      
      const saleWords = normalizedSaleName.split(' ').filter(word => word.length > 2);
      const productWords = normalizedProductName.split(' ').filter(word => word.length > 2);
      
      // Check if at least 70% of words match
      const matchingWords = saleWords.filter(saleWord => 
        productWords.some(productWord => 
          productWord.includes(saleWord) || saleWord.includes(productWord)
        )
      );
      
      return matchingWords.length >= Math.ceil(saleWords.length * 0.7);
    });

    return match || null;
  };

  // NEW: Recalculate all product quantities based on current sales
  const recalculateProductQuantities = async () => {
    console.log('🔄 Recalculating product quantities based on current sales...');
    
    // Calculate total quantities sold for each product from ALL sales
    const salesByProduct = new Map<string, { quantity: number; matchedProduct: Product }>();
    
    registerSales.forEach(sale => {
      // Find matching product using enhanced matching
      const matchedProduct = findMatchingProduct(sale.product, sale.category, products);
      
      if (matchedProduct) {
        const productKey = matchedProduct.id; // Use product ID as key for accuracy
        const existing = salesByProduct.get(productKey);
        
        if (existing) {
          existing.quantity += sale.quantity;
        } else {
          salesByProduct.set(productKey, {
            quantity: sale.quantity,
            matchedProduct
          });
        }
        
        console.log(`📊 Matched sale "${sale.product}" → "${matchedProduct.name}" (+${sale.quantity})`);
      } else {
        console.warn(`⚠️ No matching product found for sale: "${sale.product}" (${sale.category})`);
      }
    });

    console.log('📊 Sales by product:', Object.fromEntries(
      Array.from(salesByProduct.entries()).map(([key, value]) => [
        value.matchedProduct.name, 
        value.quantity
      ])
    ));

    // Update products with recalculated quantities
    const updatedProducts = products.map(product => {
      const salesData = salesByProduct.get(product.id);
      const totalQuantitySold = salesData ? salesData.quantity : 0;
      
      // Ensure we have an initial stock value
      const initialStock = product.initialStock || product.stock + (product.quantitySold || 0);
      
      // Calculate final stock: Initial - Total Sold
      const finalStock = Math.max(0, initialStock - totalQuantitySold);
      
      const updated = {
        ...product,
        initialStock,
        quantitySold: totalQuantitySold,
        stock: finalStock
      };

      // Log significant changes
      if (product.quantitySold !== totalQuantitySold || product.stock !== finalStock) {
        console.log(`📦 ${product.name}: Sold ${product.quantitySold || 0} → ${totalQuantitySold}, Stock ${product.stock} → ${finalStock}`);
      }

      return updated;
    });

    // Update local state
    setProducts(updatedProducts);

    // Update Firebase for products that changed using batch operations
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      updatedProducts.forEach((updatedProduct, index) => {
        const originalProduct = products[index];
        if (originalProduct && 
            (originalProduct.quantitySold !== updatedProduct.quantitySold || 
             originalProduct.stock !== updatedProduct.stock ||
             originalProduct.initialStock !== updatedProduct.initialStock)) {
          
          const productRef = doc(db, COLLECTIONS.PRODUCTS, updatedProduct.id);
          batch.update(productRef, {
            quantitySold: updatedProduct.quantitySold,
            stock: updatedProduct.stock,
            initialStock: updatedProduct.initialStock,
            updatedAt: new Date().toISOString()
          });
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
        console.log('✅ Product quantities updated in Firebase');
      }
    } catch (error) {
      console.error('❌ Error updating product quantities in Firebase:', error);
    }

    // Regenerate alerts after stock changes
    await generateAlerts();
  };

  const calculateDashboardStats = (sales: RegisterSale[]) => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const activeRegisters = 2;

    // Top produits
    const productStats = sales.reduce((acc, sale) => {
      if (!acc[sale.product]) {
        acc[sale.product] = { quantity: 0, revenue: 0 };
      }
      acc[sale.product].quantity += sale.quantity;
      acc[sale.product].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topProducts = Object.entries(productStats)
      .map(([product, stats]) => ({ product, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top vendeurs
    const sellerStats = sales.reduce((acc, sale) => {
      if (!acc[sale.seller]) {
        acc[sale.seller] = { quantity: 0, revenue: 0 };
      }
      acc[sale.seller].quantity += sale.quantity;
      acc[sale.seller].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const topSellers = Object.entries(sellerStats)
      .map(([seller, stats]) => ({ seller, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Performance par caisse
    const registerStats = sales.reduce((acc, sale) => {
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
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const registerPerformance = Object.entries(registerStats)
      .map(([register, stats]) => ({ register, ...stats }))
      .sort((a, b) => b.revenue - a.revenue);

    // Tendance quotidienne
    const dailyStats = sales.reduce((acc, sale) => {
      const dateKey = format(sale.date, 'dd/MM');
      if (!acc[dateKey]) {
        acc[dateKey] = { quantity: 0, revenue: 0 };
      }
      acc[dateKey].quantity += sale.quantity;
      acc[dateKey].revenue += sale.total;
      return acc;
    }, {} as { [key: string]: { quantity: number; revenue: number } });

    const dailyTrend = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .slice(-30);

    setDashboardStats({
      totalSales,
      totalRevenue,
      totalProducts: new Set(sales.map(s => s.product)).size,
      activeRegisters,
      topProducts,
      topSellers,
      registerPerformance,
      dailyTrend
    });
  };

  // ✅ NEW: Batch import for sales with 200 rows per batch
  const addRegisterSales = async (sales: RegisterSale[]) => {
    try {
      console.log(`🔥 Starting batch import of ${sales.length} sales...`);
      
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split sales into batches of 200
      for (let i = 0; i < sales.length; i += BATCH_SIZE) {
        batches.push(sales.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 Split into ${batches.length} batches of max ${BATCH_SIZE} rows each`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)...`);
        
        const writeBatchRef = writeBatch(db);
        const salesCollection = collection(db, COLLECTIONS.REGISTER_SALES);
        
        // Add all sales in this batch to the write batch
        batch.forEach(sale => {
          const docRef = doc(salesCollection);
          const saleData: Omit<FirestoreRegisterSale, 'id'> = {
            product: sale.product,
            category: sale.category,
            register: sale.register,
            date: sale.date.toISOString(),
            seller: sale.seller,
            quantity: sale.quantity,
            price: sale.price,
            total: sale.total,
            createdAt: new Date().toISOString()
          };
          writeBatchRef.set(docRef, saleData);
        });
        
        // Commit this batch
        await writeBatchRef.commit();
        console.log(`✅ Batch ${batchIndex + 1} committed successfully (${batch.length} sales)`);
      }

      console.log(`🎉 All ${sales.length} sales imported successfully in ${batches.length} batches`);

      // Reload sales data to ensure synchronization
      await loadRegisterSales();
      
      // The useEffect will automatically trigger recalculateProductQuantities
      console.log('✅ Sales import completed - quantities will be recalculated automatically');
      return true;
    } catch (error) {
      console.error('❌ Error adding sales to Firebase:', error);
      // Fallback: add locally if Firebase is not available
      const newSales = sales.map(sale => ({
        ...sale,
        id: Math.random().toString(36).substr(2, 9)
      }));
      
      setRegisterSales(prev => [...newSales, ...prev]);
      calculateDashboardStats([...newSales, ...registerSales]);
      
      return true;
    }
  };

  // ✅ NEW: Batch import for products with 200 rows per batch
  const addProducts = async (products: Omit<Product, 'id'>[]) => {
    try {
      console.log(`🔥 Starting batch import of ${products.length} products...`);
      
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split products into batches of 200
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        batches.push(products.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 Split into ${batches.length} batches of max ${BATCH_SIZE} rows each`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)...`);
        
        const writeBatchRef = writeBatch(db);
        const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
        
        // Add all products in this batch to the write batch
        batch.forEach(product => {
          const docRef = doc(productsCollection);
          const productData: Omit<FirestoreProduct, 'id'> = {
            name: product.name,
            category: product.category,
            price: product.price,
            stock: product.stock,
            initialStock: product.initialStock || product.stock,
            quantitySold: 0, // Always start with 0, will be calculated from sales
            minStock: product.minStock,
            description: product.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          writeBatchRef.set(docRef, productData);
        });
        
        // Commit this batch
        await writeBatchRef.commit();
        console.log(`✅ Batch ${batchIndex + 1} committed successfully (${batch.length} products)`);
      }

      console.log(`🎉 All ${products.length} products imported successfully in ${batches.length} batches`);

      // Reload products data
      await loadProducts();
      
      // Recalculate quantities for the new products
      setTimeout(() => recalculateProductQuantities(), 100);
      
      console.log('✅ Products import completed');
      return true;
    } catch (error) {
      console.error('❌ Error adding products to Firebase:', error);
      
      // Fallback: add locally if Firebase is not available
      const newProducts = products.map(product => ({
        ...product,
        id: Math.random().toString(36).substr(2, 9),
        initialStock: product.initialStock || product.stock,
        quantitySold: 0
      }));
      
      setProducts(prev => [...prev, ...newProducts]);
      
      // Recalculate quantities for the new products
      setTimeout(() => recalculateProductQuantities(), 100);
      return true;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const productsCollection = collection(db, COLLECTIONS.PRODUCTS);
      const productData: Omit<FirestoreProduct, 'id'> = {
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        initialStock: product.initialStock || product.stock,
        quantitySold: 0, // Always start with 0, will be calculated from sales
        minStock: product.minStock,
        description: product.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(productsCollection, productData);
      await loadProducts();
      
      // Recalculate quantities for the new product
      setTimeout(() => recalculateProductQuantities(), 100);
      
      console.log('✅ Product added successfully');
    } catch (error) {
      console.error('❌ Error adding product:', error);
      const newProduct: Product = {
        ...product,
        id: Math.random().toString(36).substr(2, 9),
        initialStock: product.initialStock || product.stock,
        quantitySold: 0
      };
      setProducts(prev => [...prev, newProduct]);
      
      // Recalculate quantities for the new product
      setTimeout(() => recalculateProductQuantities(), 100);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      const updateData: Partial<FirestoreProduct> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(productRef, updateData);
      
      // Update local state immediately
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      
      await generateAlerts();
      console.log('✅ Product updated successfully');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      await generateAlerts();
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      await deleteDoc(productRef);
      
      // Update local state immediately
      setProducts(prev => prev.filter(p => p.id !== id));
      
      await generateAlerts();
      console.log('✅ Product deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      setProducts(prev => prev.filter(p => p.id !== id));
      await generateAlerts();
    }
  };

  const deleteProducts = async (productIds: string[]) => {
    try {
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split into batches of 200
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        batches.push(productIds.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch
      for (const batch of batches) {
        const writeBatchRef = writeBatch(db);
        
        batch.forEach(id => {
          const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
          writeBatchRef.delete(productRef);
        });
        
        await writeBatchRef.commit();
      }
      
      // Update local state immediately
      setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      
      await generateAlerts();
      console.log(`✅ ${productIds.length} products deleted successfully`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting products:', error);
      setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      await generateAlerts();
      return false;
    }
  };

  const deleteSales = async (saleIds: string[]) => {
    try {
      const BATCH_SIZE = 200;
      const batches = [];
      
      // Split into batches of 200
      for (let i = 0; i < saleIds.length; i += BATCH_SIZE) {
        batches.push(saleIds.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch
      for (const batch of batches) {
        const writeBatchRef = writeBatch(db);
        
        batch.forEach(id => {
          const saleRef = doc(db, COLLECTIONS.REGISTER_SALES, id);
          writeBatchRef.delete(saleRef);
        });
        
        await writeBatchRef.commit();
      }
      
      // Reload sales data
      await loadRegisterSales();
      
      // The useEffect will automatically trigger recalculateProductQuantities
      console.log(`✅ ${saleIds.length} sales deleted successfully - quantities will be recalculated automatically`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting sales:', error);
      // Fallback: update local state
      setRegisterSales(prev => prev.filter(s => !saleIds.includes(s.id)));
      
      // Recalculate quantities after local deletion
      setTimeout(() => recalculateProductQuantities(), 100);
      return false;
    }
  };

  const generateAlerts = async () => {
    const newAlerts: Alert[] = [];

    // Alertes de stock faible
    products.forEach(product => {
      if (product.stock <= product.minStock) {
        const severity = product.stock === 0 ? 'error' : 'warning';
        const message = product.stock === 0 
          ? `Rupture de stock pour ${product.name}` 
          : `Stock faible pour ${product.name} (${product.stock} unités restantes, minimum: ${product.minStock})`;
        
        newAlerts.push({
          id: `low-stock-${product.id}`,
          type: 'low-stock',
          message,
          severity,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Alerte de ventes élevées
    const today = new Date();
    const todaySales = registerSales.filter(sale => 
      sale.date.toDateString() === today.toDateString()
    );

    if (todaySales.length > 50) {
      newAlerts.push({
        id: 'high-sales-today',
        type: 'high-sales',
        message: `Journée exceptionnelle ! ${todaySales.length} ventes réalisées aujourd'hui`,
        severity: 'info',
        timestamp: new Date(),
        read: false
      });
    }

    setAlerts(newAlerts);
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const refreshData = async () => {
    console.log('🔄 Refreshing all data...');
    await loadInitialData();
    // The useEffect will automatically trigger recalculateProductQuantities
    console.log('✅ Data refresh completed');
  };

  return {
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
  };
}

// Mock data functions (same as before)
function generateMockSales(): RegisterSale[] {
  const products = ['Pain de mie', 'Lait UHT', 'Yaourt nature', 'Pommes', 'Bananes', 'Coca-Cola', 'Eau minérale'];
  const categories = ['Alimentaire', 'Boisson', 'Fruits'];
  const registers = ['Register1', 'Register2'];
  const sellers = ['Marie Dupont', 'Jean Martin', 'Sophie Bernard', 'Pierre Durand'];

  return Array.from({ length: 150 }, (_, i) => {
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const price = Math.random() * 10 + 1;
    
    return {
      id: `sale-${i}`,
      product,
      category: categories[Math.floor(Math.random() * categories.length)],
      register: registers[Math.floor(Math.random() * registers.length)],
      date: subDays(new Date(), Math.floor(Math.random() * 30)),
      seller: sellers[Math.floor(Math.random() * sellers.length)],
      quantity,
      price: Math.round(price * 100) / 100,
      total: Math.round(quantity * price * 100) / 100
    };
  });
}

function generateMockProducts(): Product[] {
  return [
    {
      id: '1',
      name: 'JELLY POP',
      category: 'CONFISERIES',
      price: 1.00,
      stock: 45,
      initialStock: 50,
      quantitySold: 5,
      minStock: 10,
      description: 'Bonbons Jelly Pop'
    },
    {
      id: '2',
      name: 'SMARTIES',
      category: 'CONFISERIES',
      price: 1.00,
      stock: 8,
      initialStock: 20,
      quantitySold: 12,
      minStock: 15,
      description: 'Bonbons Smarties'
    },
    {
      id: '3',
      name: 'COCA 1,5L',
      category: 'BOISSONS',
      price: 2.50,
      stock: 25,
      initialStock: 30,
      quantitySold: 5,
      minStock: 12,
      description: 'Coca-Cola 1.5L'
    },
    {
      id: '4',
      name: 'Pain de mie',
      category: 'Alimentaire',
      price: 1.50,
      stock: 30,
      initialStock: 35,
      quantitySold: 5,
      minStock: 10,
      description: 'Pain de mie complet'
    },
    {
      id: '5',
      name: 'Lait UHT',
      category: 'Alimentaire',
      price: 1.20,
      stock: 5,
      initialStock: 20,
      quantitySold: 15,
      minStock: 15,
      description: 'Lait UHT demi-écrémé 1L'
    }
  ];
}