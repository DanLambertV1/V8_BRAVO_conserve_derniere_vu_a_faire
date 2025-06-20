import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, Info, X, Trash2, BookMarked as MarkAsRead, Filter, Search, Calendar, Package, TrendingUp, Users, Settings, RefreshCw, Archive, Star, Clock, Eye, EyeOff, Volume2, VolumeX, Download } from 'lucide-react';
import { format, isToday, isYesterday, subDays } from 'date-fns';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'stock' | 'sales' | 'system' | 'user' | 'security';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: {
    productId?: string;
    sellerId?: string;
    amount?: number;
    quantity?: number;
  };
}

interface NotificationSettings {
  sound: boolean;
  desktop: boolean;
  email: boolean;
  categories: {
    stock: boolean;
    sales: boolean;
    system: boolean;
    user: boolean;
    security: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
}

export function NotificationsModule() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'priority'>('timestamp');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    sound: true,
    desktop: true,
    email: false,
    categories: {
      stock: true,
      sales: true,
      system: true,
      user: true,
      security: true
    },
    priorities: {
      low: true,
      medium: true,
      high: true,
      urgent: true
    }
  });

  // Generate mock notifications
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'warning',
        category: 'stock',
        title: 'Stock faible détecté',
        message: 'Le produit "Pain de mie" n\'a plus que 3 unités en stock (minimum: 10)',
        timestamp: new Date(),
        read: false,
        starred: true,
        priority: 'high',
        metadata: { productId: 'prod-1', quantity: 3 }
      },
      {
        id: '2',
        type: 'success',
        category: 'sales',
        title: 'Objectif de vente atteint',
        message: 'Félicitations ! L\'objectif de vente quotidien a été dépassé de 15%',
        timestamp: subDays(new Date(), 0),
        read: false,
        starred: false,
        priority: 'medium',
        metadata: { amount: 2450 }
      },
      {
        id: '3',
        type: 'error',
        category: 'system',
        title: 'Erreur de synchronisation',
        message: 'Échec de la synchronisation avec la base de données. Tentative de reconnexion...',
        timestamp: subDays(new Date(), 0),
        read: true,
        starred: false,
        priority: 'urgent'
      },
      {
        id: '4',
        type: 'info',
        category: 'user',
        title: 'Nouvelle connexion détectée',
        message: 'Marie Dupont s\'est connectée depuis un nouvel appareil (Chrome, Windows)',
        timestamp: subDays(new Date(), 1),
        read: true,
        starred: false,
        priority: 'low'
      },
      {
        id: '5',
        type: 'warning',
        category: 'security',
        title: 'Tentative de connexion suspecte',
        message: 'Plusieurs tentatives de connexion échouées détectées depuis l\'IP 192.168.1.100',
        timestamp: subDays(new Date(), 1),
        read: false,
        starred: true,
        priority: 'urgent'
      },
      {
        id: '6',
        type: 'success',
        category: 'sales',
        title: 'Nouveau record de vente',
        message: 'Jean Martin a réalisé la plus grosse vente de la semaine : 850€',
        timestamp: subDays(new Date(), 2),
        read: true,
        starred: false,
        priority: 'medium',
        metadata: { sellerId: 'seller-1', amount: 850 }
      },
      {
        id: '7',
        type: 'info',
        category: 'system',
        title: 'Mise à jour disponible',
        message: 'Une nouvelle version (2.1.1) est disponible avec des corrections de bugs',
        timestamp: subDays(new Date(), 3),
        read: false,
        starred: false,
        priority: 'low'
      },
      {
        id: '8',
        type: 'warning',
        category: 'stock',
        title: 'Produits expirés détectés',
        message: '5 produits ont dépassé leur date de péremption et doivent être retirés',
        timestamp: subDays(new Date(), 4),
        read: true,
        starred: false,
        priority: 'high',
        metadata: { quantity: 5 }
      }
    ];

    setNotifications(mockNotifications);
  }, []);

  // Filter notifications
  useEffect(() => {
    let filtered = notifications;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(notification => notification.category === filterCategory);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }

    // Read status filter
    if (filterRead === 'unread') {
      filtered = filtered.filter(notification => !notification.read);
    } else if (filterRead === 'read') {
      filtered = filtered.filter(notification => notification.read);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      } else {
        return b.timestamp.getTime() - a.timestamp.getTime();
      }
    });

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, filterCategory, filterType, filterRead, sortBy]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return X;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'error': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock': return Package;
      case 'sales': return TrendingUp;
      case 'user': return Users;
      case 'security': return AlertTriangle;
      default: return Settings;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return `Aujourd'hui à ${format(timestamp, 'HH:mm')}`;
    } else if (isYesterday(timestamp)) {
      return `Hier à ${format(timestamp, 'HH:mm')}`;
    } else {
      return format(timestamp, 'dd/MM/yyyy à HH:mm');
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const toggleStar = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, starred: !notification.starred } : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const deleteAllRead = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications lues ?')) {
      setNotifications(prev => prev.filter(notification => !notification.read));
    }
  };

  const refreshNotifications = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const exportNotifications = () => {
    const dataToExport = {
      notifications: filteredNotifications,
      exportDate: new Date().toISOString(),
      filters: {
        searchTerm,
        filterCategory,
        filterType,
        filterRead,
        sortBy
      }
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const starredCount = notifications.filter(n => n.starred).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400">Centre de notifications et alertes système</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={refreshNotifications}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 
                       disabled:opacity-50 transition-all duration-200 flex items-center space-x-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 
                       transition-all duration-200 flex items-center space-x-2"
          >
            <Settings className="w-5 h-5" />
            <span>Paramètres</span>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Bell className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{notifications.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Eye className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-gray-400 text-sm">Non lues</p>
              <p className="text-2xl font-bold text-white">{unreadCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Star className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-gray-400 text-sm">Importantes</p>
              <p className="text-2xl font-bold text-white">{starredCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-gray-400 text-sm">Urgentes</p>
              <p className="text-2xl font-bold text-white">
                {notifications.filter(n => n.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Paramètres de Notification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-3">Méthodes de notification</h4>
                <div className="space-y-3">
                  {[
                    { key: 'sound', label: 'Sons', icon: Volume2 },
                    { key: 'desktop', label: 'Notifications bureau', icon: Monitor },
                    { key: 'email', label: 'Email', icon: Bell }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white">{label}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[key as keyof typeof settings] as boolean}
                          onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                                       peer-checked:after:translate-x-full peer-checked:after:border-white 
                                       after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                       after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                                       peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-3">Catégories</h4>
                <div className="space-y-3">
                  {Object.entries(settings.categories).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <span className="text-white capitalize">{key}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            categories: { ...prev.categories, [key]: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer 
                                       peer-checked:after:translate-x-full peer-checked:after:border-white 
                                       after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                       after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                                       peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and actions */}
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                           placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Toutes catégories</option>
              <option value="stock">Stock</option>
              <option value="sales">Ventes</option>
              <option value="system">Système</option>
              <option value="user">Utilisateur</option>
              <option value="security">Sécurité</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Tous types</option>
              <option value="info">Information</option>
              <option value="success">Succès</option>
              <option value="warning">Avertissement</option>
              <option value="error">Erreur</option>
            </select>
            
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                         focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Toutes</option>
              <option value="unread">Non lues</option>
              <option value="read">Lues</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={markAllAsRead}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold 
                         py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 
                         transition-all duration-200 text-sm"
            >
              Tout marquer lu
            </button>
            
            <button
              onClick={deleteAllRead}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold 
                         py-2 px-4 rounded-lg hover:from-red-600 hover:to-red-700 
                         transition-all duration-200 text-sm"
            >
              Supprimer lues
            </button>
            
            <button
              onClick={exportNotifications}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold 
                         py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 
                         transition-all duration-200 text-sm flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications list */}
      <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            Notifications ({filteredNotifications.length})
          </h3>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'priority')}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
                       focus:outline-none focus:border-cyan-500"
          >
            <option value="timestamp">Trier par date</option>
            <option value="priority">Trier par priorité</option>
          </select>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const CategoryIcon = getCategoryIcon(notification.category);
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border transition-all duration-200 hover:bg-gray-700/20 ${
                    notification.read ? 'bg-gray-700/10 border-gray-700/50' : 'bg-gray-700/30 border-gray-600'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Priority indicator */}
                    <div className={`w-1 h-16 rounded-full ${getPriorityColor(notification.priority)}`}></div>
                    
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <CategoryIcon className="w-4 h-4 text-gray-400" />
                            <h4 className={`font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                              {notification.title}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              notification.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              notification.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {notification.priority}
                            </span>
                          </div>
                          
                          <p className={`text-sm mb-2 ${notification.read ? 'text-gray-400' : 'text-gray-300'}`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </span>
                            
                            <span className="capitalize">{notification.category}</span>
                            
                            {notification.metadata && (
                              <span className="text-cyan-400">
                                {notification.metadata.amount && `${notification.metadata.amount}€`}
                                {notification.metadata.quantity && `Qté: ${notification.metadata.quantity}`}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleStar(notification.id)}
                            className={`p-1 rounded transition-colors duration-200 ${
                              notification.starred ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-400'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${notification.starred ? 'fill-current' : ''}`} />
                          </button>
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-green-400 transition-colors duration-200"
                              title="Marquer comme lu"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors duration-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Aucune notification</h3>
              <p className="text-gray-500">
                {searchTerm || filterCategory !== 'all' || filterType !== 'all' || filterRead !== 'all'
                  ? 'Aucune notification ne correspond aux filtres sélectionnés'
                  : 'Vous n\'avez aucune notification pour le moment'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}