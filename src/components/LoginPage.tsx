import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn,
  AlertCircle,
  RefreshCw,
  UserPlus,
  User,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'seller' | 'viewer'>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  
  const { login, signUp } = useAuth();

  const validateForm = () => {
    if (!email || !password) {
      setAuthError('Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (password.length < 8) {
      setAuthError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setAuthError('Le nom est requis');
        return false;
      }

      if (password !== confirmPassword) {
        setAuthError('Les mots de passe ne correspondent pas');
        return false;
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        setAuthError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const success = await signUp(email, password, name, role);
        
        if (success) {
          setSignUpSuccess(true);
          // Reset form
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setName('');
          setRole('manager');
          
          // Auto switch to login after 3 seconds
          setTimeout(() => {
            setSignUpSuccess(false);
            setIsSignUp(false);
          }, 3000);
        }
      } else {
        const success = await login(email, password);
        
        if (success) {
          onLoginSuccess();
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setRole('manager');
    setAuthError('');
    setSignUpSuccess(false);
  };

  const switchMode = () => {
    resetForm();
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl 
                       flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-cyan-500/20"
          >
            <BarChart3 className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Global VA MADA
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-400"
          >
            Système de Suivi des Ventes
          </motion.p>
        </div>

        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/30 backdrop-blur-xl border border-gray-700 rounded-2xl p-8 shadow-2xl"
        >
          {/* Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {isSignUp ? 'Créer un compte' : 'Connexion'}
            </h2>
            
            {!signUpSuccess && (
              <button
                type="button"
                onClick={switchMode}
                className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors duration-200 
                           flex items-center space-x-1"
              >
                {isSignUp ? (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Créer un compte</span>
                  </>
                )}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {signUpSuccess ? (
              /* Success Message */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Compte créé avec succès !</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Votre compte a été créé. Vous pouvez maintenant vous connecter.
                </p>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-center space-x-2 text-green-400 text-sm">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full"
                    />
                    <span>Redirection vers la connexion...</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Auth Form */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Name Field (Sign Up Only) */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nom complet *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required={isSignUp}
                          className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white
                                     placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 
                                     focus:ring-cyan-500/20 transition-all duration-200"
                          placeholder="Votre nom complet"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Adresse email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white
                                 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 
                                 focus:ring-cyan-500/20 transition-all duration-200"
                      placeholder="Votre adresse email"
                    />
                  </div>
                </div>

                {/* Role Field (Sign Up Only) */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Rôle *
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        required={isSignUp}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white
                                   focus:outline-none focus:border-cyan-500 focus:ring-2 
                                   focus:ring-cyan-500/20 transition-all duration-200"
                      >
                        <option value="viewer">Observateur - Lecture seule</option>
                        <option value="seller">Vendeur - Ventes et stock</option>
                        <option value="manager">Gestionnaire - Accès complet</option>
                        <option value="admin">Administrateur - Tous droits</option>
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white
                                 placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 
                                 focus:ring-cyan-500/20 transition-all duration-200"
                      placeholder={isSignUp ? "Minimum 8 caractères" : "Votre mot de passe"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 
                                 hover:text-white transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="text-xs text-gray-500 mt-1">
                      Doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre
                    </p>
                  )}
                </div>

                {/* Confirm Password Field (Sign Up Only) */}
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Confirmer le mot de passe *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={isSignUp}
                          className="w-full pl-12 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white
                                     placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 
                                     focus:ring-cyan-500/20 transition-all duration-200"
                          placeholder="Répétez votre mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 
                                     hover:text-white transition-colors duration-200"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember Me (Login Only) */}
                {!isSignUp && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded 
                                   focus:ring-cyan-500 focus:ring-2"
                      />
                      <span className="text-sm text-gray-400">Se souvenir de moi</span>
                    </label>
                    
                    <button
                      type="button"
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {/* Error Message */}
                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="text-red-400 text-sm">{authError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password || (isSignUp && (!name || !confirmPassword))}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold 
                             py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-purple-600 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center space-x-2
                             shadow-lg shadow-cyan-500/25"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{isSignUp ? 'Création...' : 'Connexion...'}</span>
                    </>
                  ) : (
                    <>
                      {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                      <span>{isSignUp ? 'Créer le compte' : 'Se connecter'}</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 text-gray-400 text-sm"
        >
          <p>© 2024 Global VA MADA. Tous droits réservés.</p>
          <p className="mt-1">Système de gestion des ventes et du stock</p>
        </motion.div>
      </motion.div>
    </div>
  );
}