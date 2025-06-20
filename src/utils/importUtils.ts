import { RegisterSale, ImportPreview, ImportError } from '../types';
import { parseISO, isValid } from 'date-fns';

export interface ImportColumn {
  product: string;
  category: string;
  register: string;
  date: string;
  seller: string;
  quantity: string;
  amount: string;
}

// Clean and normalize column names with enhanced mapping
function cleanColumnName(name: string): string {
  // Remove extra spaces, normalize accents, and clean
  let cleaned = name.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
  
  // Convert to lowercase for mapping
  const lowerCleaned = cleaned.toLowerCase();
  
  // Enhanced mappings for the specific Excel format provided
  const mappings: { [key: string]: string } = {
    // Product variations
    'product': 'Product',
    'produit': 'Product',
    'article': 'Product',
    'nom': 'Product',
    'name': 'Product',
    'item': 'Product',
    
    // Category variations (including Type mapping)
    'category': 'Category',
    'categorie': 'Category',
    'type': 'Category',
    'famille': 'Category',
    'group': 'Category',
    'groupe': 'Category',
    
    // Register variations
    'register': 'Register',
    'caisse': 'Register',
    'pos': 'Register',
    'till': 'Register',
    'checkout': 'Register',
    
    // Date variations
    'date': 'Date',
    'jour': 'Date',
    'day': 'Date',
    'time': 'Date',
    'timestamp': 'Date',
    
    // Seller variations
    'seller': 'Seller',
    'vendeur': 'Seller',
    'employe': 'Seller',
    'employee': 'Seller',
    'cashier': 'Seller',
    'caissier': 'Seller',
    'user': 'Seller',
    'utilisateur': 'Seller',
    
    // Quantity variations
    'quantity': 'Quantity',
    'quantite': 'Quantity',
    'qty': 'Quantity',
    'qte': 'Quantity',
    'stock': 'Quantity',
    'nb': 'Quantity',
    'nombre': 'Quantity',
    'count': 'Quantity',
    
    // Amount variations (including Prix and Montant which appear in your data)
    'amount': 'Amount',
    'montant': 'Amount',
    'prix': 'Amount',
    'price': 'Amount',
    'total': 'Amount',
    'cost': 'Amount',
    'cout': 'Amount',
    'value': 'Amount',
    'valeur': 'Amount'
  };
  
  // Check for exact match first
  if (mappings[lowerCleaned]) {
    return mappings[lowerCleaned];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(mappings)) {
    if (lowerCleaned.includes(key) || key.includes(lowerCleaned)) {
      return value;
    }
  }
  
  // If no mapping found, return title case version
  return cleaned.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// Parse amount with support for negative values and currency symbols
function parseAmount(amountString: string): number | null {
  if (!amountString || typeof amountString !== 'string') {
    return null;
  }
  
  // Clean the amount string
  let cleaned = amountString.toString().trim();
  
  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[€$£¥₹]/g, ''); // Remove common currency symbols
  cleaned = cleaned.replace(/\s/g, ''); // Remove all spaces
  
  // Handle French number format (comma as decimal separator)
  // Replace comma with dot for parsing
  cleaned = cleaned.replace(',', '.');
  
  // Check if it's a negative value
  const isNegative = cleaned.includes('-');
  
  // Remove the negative sign for parsing
  cleaned = cleaned.replace('-', '');
  
  // Parse the number
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  // Apply negative sign if needed
  return isNegative ? -parsed : parsed;
}

export function validateAndProcessImport(rawData: any[]): ImportPreview {
  const requiredColumns = ['Product', 'Category', 'Register', 'Date', 'Seller', 'Quantity', 'Amount'];
  const validSales: RegisterSale[] = [];
  const errors: ImportError[] = [];
  const duplicates: RegisterSale[] = [];

  // Check if data exists
  if (rawData.length === 0) {
    errors.push({
      row: 0,
      field: 'structure',
      value: null,
      message: 'Aucune donnée trouvée dans le fichier'
    });
    
    return {
      data: [],
      duplicates: [],
      errors,
      totals: {
        byProduct: {},
        bySeller: {},
        byRegister: {},
        overall: { quantity: 0, revenue: 0 }
      }
    };
  }

  // Get available columns from first row and normalize them
  const firstRow = rawData[0];
  const rawColumns = Object.keys(firstRow).filter(key => key !== '_rowIndex');
  
  // Create mapping from raw columns to normalized columns
  const columnMapping: { [key: string]: string } = {};
  const normalizedColumns: string[] = [];
  
  rawColumns.forEach(rawCol => {
    const normalized = cleanColumnName(rawCol);
    columnMapping[rawCol] = normalized;
    normalizedColumns.push(normalized);
  });
  
  console.log('Raw columns:', rawColumns);
  console.log('Column mapping:', columnMapping);
  console.log('Normalized columns:', normalizedColumns);
  console.log('Required columns:', requiredColumns);
  
  // Check for required columns
  const missingColumns = requiredColumns.filter(required => 
    !normalizedColumns.includes(required)
  );

  if (missingColumns.length > 0) {
    // Create detailed error message with suggestions
    let errorMessage = `Colonnes manquantes ou mal nommées.\n\n`;
    errorMessage += `📋 Colonnes requises: ${requiredColumns.join(', ')}\n`;
    errorMessage += `📄 Colonnes trouvées: ${normalizedColumns.join(', ')}\n`;
    errorMessage += `❌ Colonnes manquantes: ${missingColumns.join(', ')}\n\n`;
    
    errorMessage += `💡 Suggestions de mapping automatique:\n`;
    rawColumns.forEach(rawCol => {
      const normalized = columnMapping[rawCol];
      if (requiredColumns.includes(normalized)) {
        errorMessage += `✅ "${rawCol}" → "${normalized}"\n`;
      } else {
        errorMessage += `❓ "${rawCol}" → "${normalized}" (non reconnu)\n`;
      }
    });
    
    errorMessage += `\n🔧 Pour corriger:\n`;
    errorMessage += `• Renommez vos colonnes pour qu'elles correspondent aux noms requis\n`;
    errorMessage += `• Ou utilisez des variantes reconnues:\n`;
    errorMessage += `  - Product: "Produit", "Article", "Nom"\n`;
    errorMessage += `  - Category: "Catégorie", "Type", "Famille"\n`;
    errorMessage += `  - Register: "Caisse", "POS"\n`;
    errorMessage += `  - Date: "Date", "Jour"\n`;
    errorMessage += `  - Seller: "Vendeur", "Employé", "Caissier"\n`;
    errorMessage += `  - Quantity: "Quantité", "Qty", "Qté"\n`;
    errorMessage += `  - Amount: "Montant", "Prix", "Price"`;

    errors.push({
      row: 1,
      field: 'structure',
      value: missingColumns,
      message: errorMessage
    });
    
    return {
      data: [],
      duplicates: [],
      errors,
      totals: {
        byProduct: {},
        bySeller: {},
        byRegister: {},
        overall: { quantity: 0, revenue: 0 }
      }
    };
  }

  // Create reverse mapping to find original column names
  const reverseMapping: { [key: string]: string } = {};
  Object.entries(columnMapping).forEach(([rawCol, normalized]) => {
    reverseMapping[normalized] = rawCol;
  });

  // Process each row
  const processedSales = new Set<string>();
  
  rawData.forEach((row, index) => {
    const rowNumber = row._rowIndex || index + 2;
    const sale: Partial<RegisterSale> = {
      id: Math.random().toString(36).substr(2, 9)
    };

    try {
      // Product
      const productField = row[reverseMapping.Product] || '';
      if (!productField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Product',
          value: productField,
          message: 'Le nom du produit est requis'
        });
      } else {
        sale.product = productField.toString().trim();
      }

      // Category (mapped from Type if needed)
      const categoryField = row[reverseMapping.Category] || '';
      if (!categoryField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Category',
          value: categoryField,
          message: 'La catégorie de produit est requise'
        });
      } else {
        sale.category = categoryField.toString().trim();
      }

      // Register - Normalize to Register1 or Register2
      const registerField = row[reverseMapping.Register] || '';
      if (!registerField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Register',
          value: registerField,
          message: 'La caisse est requise'
        });
      } else {
        let normalizedRegister = registerField.toString().trim();
        const lowerRegister = normalizedRegister.toLowerCase();
        
        if (lowerRegister.includes('1') || lowerRegister.includes('caisse1') || lowerRegister === 'caisse 1') {
          normalizedRegister = 'Register1';
        } else if (lowerRegister.includes('2') || lowerRegister.includes('caisse2') || lowerRegister === 'caisse 2') {
          normalizedRegister = 'Register2';
        } else {
          // Default to Register1 if not clearly specified
          normalizedRegister = 'Register1';
        }
        sale.register = normalizedRegister;
      }

      // Date
      const dateField = row[reverseMapping.Date] || '';
      if (!dateField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Date',
          value: dateField,
          message: 'La date est requise'
        });
      } else {
        const parsedDate = parseDate(dateField.toString());
        if (!parsedDate) {
          errors.push({
            row: rowNumber,
            field: 'Date',
            value: dateField,
            message: 'Format de date invalide (utilisez DD/MM/YYYY, YYYY-MM-DD ou format Excel)'
          });
        } else {
          sale.date = parsedDate;
        }
      }

      // Seller
      const sellerField = row[reverseMapping.Seller] || '';
      if (!sellerField.toString().trim()) {
        errors.push({
          row: rowNumber,
          field: 'Seller',
          value: sellerField,
          message: 'Le vendeur est requis'
        });
      } else {
        sale.seller = sellerField.toString().trim();
      }

      // Quantity - Always positive, separate from amount
      const quantityField = row[reverseMapping.Quantity] || '';
      const quantity = parseFloat(quantityField.toString());
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({
          row: rowNumber,
          field: 'Quantity',
          value: quantityField,
          message: 'La quantité doit être un nombre positif'
        });
      } else {
        sale.quantity = quantity;
      }

      // Amount - This IS the total sales value, not unit price
      const amountField = row[reverseMapping.Amount] || '';
      const parsedAmount = parseAmount(amountField.toString());
      
      if (parsedAmount === null) {
        errors.push({
          row: rowNumber,
          field: 'Amount',
          value: amountField,
          message: 'Le montant doit être un nombre valide (peut être négatif pour les remboursements)'
        });
      } else {
        // The Amount column IS the total sales value
        sale.total = parsedAmount;
        
        // Calculate unit price from total and quantity
        if (sale.quantity && sale.quantity > 0) {
          sale.price = Math.round((parsedAmount / sale.quantity) * 100) / 100;
        } else {
          sale.price = parsedAmount;
        }
      }

      // Check if sale is complete
      if (sale.product && sale.category && sale.register && sale.date && 
          sale.seller && sale.quantity && sale.total !== undefined && sale.price !== undefined) {
        
        // Check for exact duplicates
        const saleKey = `${sale.product}-${sale.category}-${sale.register}-${sale.date?.toISOString()}-${sale.seller}-${sale.quantity}-${sale.total}`;
        
        if (processedSales.has(saleKey)) {
          duplicates.push(sale as RegisterSale);
        } else {
          processedSales.add(saleKey);
          validSales.push(sale as RegisterSale);
        }
      }

    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'general',
        value: row,
        message: 'Erreur lors du traitement de la ligne'
      });
    }
  });

  // Calculate totals using the Amount column directly
  const totals = calculateTotals(validSales);

  return {
    data: validSales,
    duplicates,
    errors,
    totals
  };
}

function parseDate(dateString: string): Date | null {
  const trimmed = dateString.trim();
  
  // Handle Excel date numbers (days since 1900-01-01)
  const excelDateNumber = parseFloat(trimmed);
  if (!isNaN(excelDateNumber) && excelDateNumber > 1) {
    // Excel date serial number
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (excelDateNumber - 2) * 24 * 60 * 60 * 1000);
    if (isValid(date)) {
      return date;
    }
  }
  
  // Format DD/MM/YYYY (your format)
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValid(date) ? date : null;
  }
  
  // Format YYYY-MM-DD
  const isoDate = parseISO(trimmed);
  if (isValid(isoDate)) {
    return isoDate;
  }
  
  // Format DD-MM-YYYY
  const ddmmyyyyDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDashMatch) {
    const [, day, month, year] = ddmmyyyyDashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValid(date) ? date : null;
  }
  
  // Try to parse as a standard date
  const standardDate = new Date(trimmed);
  if (isValid(standardDate)) {
    return standardDate;
  }
  
  return null;
}

function calculateTotals(sales: RegisterSale[]) {
  const byProduct: { [key: string]: { quantity: number; revenue: number } } = {};
  const bySeller: { [key: string]: { quantity: number; revenue: number } } = {};
  const byRegister: { [key: string]: { quantity: number; revenue: number } } = {};
  
  let totalQuantity = 0;
  let totalRevenue = 0;

  sales.forEach(sale => {
    // By product - use the total amount directly
    if (!byProduct[sale.product]) {
      byProduct[sale.product] = { quantity: 0, revenue: 0 };
    }
    byProduct[sale.product].quantity += sale.quantity;
    byProduct[sale.product].revenue += sale.total; // Use total directly

    // By seller - use the total amount directly
    if (!bySeller[sale.seller]) {
      bySeller[sale.seller] = { quantity: 0, revenue: 0 };
    }
    bySeller[sale.seller].quantity += sale.quantity;
    bySeller[sale.seller].revenue += sale.total; // Use total directly

    // By register - use the total amount directly
    if (!byRegister[sale.register]) {
      byRegister[sale.register] = { quantity: 0, revenue: 0 };
    }
    byRegister[sale.register].quantity += sale.quantity;
    byRegister[sale.register].revenue += sale.total; // Use total directly

    // Overall totals - use the total amount directly
    totalQuantity += sale.quantity;
    totalRevenue += sale.total; // Use total directly
  });

  return {
    byProduct,
    bySeller,
    byRegister,
    overall: { quantity: totalQuantity, revenue: totalRevenue }
  };
}

export function exportToCSV(data: RegisterSale[], filename: string) {
  const headers = ['Product', 'Category', 'Register', 'Date', 'Seller', 'Quantity', 'Amount', 'Total'];
  
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(sale => {
    const row = [
      `"${sale.product}"`,
      `"${sale.category}"`,
      `"${sale.register}"`,
      sale.date.toLocaleDateString('fr-FR'),
      `"${sale.seller}"`,
      sale.quantity,
      sale.price,
      sale.total
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}