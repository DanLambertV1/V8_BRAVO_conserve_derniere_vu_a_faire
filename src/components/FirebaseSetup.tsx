import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { initializeFirebaseCollections } from '../utils/firebaseSetup';

export function FirebaseSetup() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStatus, setInitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitStatus('idle');
    setMessage('');

    try {
      const success = await initializeFirebaseCollections();
      
      if (success) {
        setInitStatus('success');
        setMessage('Firebase collections initialized successfully! You can now use the application.');
      } else {
        setInitStatus('error');
        setMessage('Failed to initialize Firebase collections. Please check your configuration.');
      }
    } catch (error) {
      setInitStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl 
                 border border-blue-500/30 rounded-2xl p-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <Database className="w-6 h-6 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Firebase Database Setup</h3>
      </div>
      
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h4 className="text-blue-400 font-semibold mb-2">🔥 Firebase Configuration</h4>
          <div className="text-gray-300 text-sm space-y-1">
            <p><strong>Project ID:</strong> suiviventes-v3-moderne</p>
            <p><strong>Status:</strong> Connected and Ready</p>
            <p><strong>Collections:</strong> register_sales, products, users, alerts</p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <h4 className="text-yellow-400 font-semibold mb-2">⚡ Quick Setup</h4>
          <p className="text-gray-300 text-sm mb-3">
            Initialize your Firebase database with sample data to get started quickly.
            This will create the necessary collections and add sample products and sales.
          </p>
          
          <button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold 
                       py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-600 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center space-x-2"
          >
            {isInitializing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Initialize Firebase Collections</span>
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {initStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center space-x-3"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">{message}</span>
          </motion.div>
        )}

        {initStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">{message}</span>
          </motion.div>
        )}

        <div className="bg-gray-700/30 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">📋 Next Steps</h4>
          <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
            <li>Click "Initialize Firebase Collections" to set up your database</li>
            <li>Configure Firestore security rules in the Firebase Console</li>
            <li>Start importing your sales data or adding products</li>
            <li>Customize the application settings as needed</li>
          </ol>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <h4 className="text-orange-400 font-semibold mb-2">🔒 Security Notice</h4>
          <p className="text-gray-300 text-sm">
            The current Firestore rules allow open access for development. 
            Make sure to update the security rules in the Firebase Console before going to production.
          </p>
        </div>
      </div>
    </motion.div>
  );
}