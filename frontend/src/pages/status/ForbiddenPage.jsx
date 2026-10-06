import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, Lock, ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';

export const ForbiddenPage = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <motion.div
          initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20"
        >
          <Lock className="w-12 h-12 stroke-1.5" />
        </motion.div>

        <div className="space-y-2">
          <div className="text-6xl font-black tracking-tight text-white font-mono">403</div>
          <h1 className="text-2xl font-extrabold text-white">Restricted Club Area</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Access denied. This zone requires specific Role-Based Access Control (e.g. OWNER, MANAGER, or VIP Tier credentials).
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary" size="md" startIcon={<Home className="w-4 h-4" />}>
              Return to Public Portal
            </Button>
          </Link>
          <Link to="/console">
            <Button variant="outline" size="md" startIcon={<ShieldAlert className="w-4 h-4" />}>
              Staff Switcher
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
