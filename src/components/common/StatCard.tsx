import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color: 'cyan' | 'purple' | 'green' | 'red' | 'yellow';
  delay?: number;
}

const colorClasses = {
  cyan: {
    bg: 'from-cyan-500/20 to-cyan-600/20',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    glow: 'shadow-cyan-500/20'
  },
  purple: {
    bg: 'from-purple-500/20 to-purple-600/20',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    glow: 'shadow-purple-500/20'
  },
  green: {
    bg: 'from-green-500/20 to-green-600/20',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    glow: 'shadow-green-500/20'
  },
  red: {
    bg: 'from-red-500/20 to-red-600/20',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    glow: 'shadow-red-500/20'
  },
  yellow: {
    bg: 'from-yellow-500/20 to-yellow-600/20',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-400',
    glow: 'shadow-yellow-500/20'
  }
};

export function StatCard({ title, value, change, icon: Icon, color, delay = 0 }: StatCardProps) {
  const classes = colorClasses[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-gradient-to-br ${classes.bg} backdrop-blur-xl border ${classes.border} 
                  rounded-2xl p-6 shadow-xl ${classes.glow} hover:shadow-2xl transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gray-800/50 ${classes.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <span className={`text-sm font-semibold ${
            change >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}