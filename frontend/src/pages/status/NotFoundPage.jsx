import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Compass, Home, Search, Trophy } from 'lucide-react';
import Button from '../../components/ui/Button';

export const NotFoundPage = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        {/* Animated Badge Icon */}
        <motion.div
          initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-glow"
        >
          <Compass className="w-12 h-12 stroke-1.5 animate-pulse" />
        </motion.div>

        <div className="space-y-2">
          <div className="text-6xl font-black tracking-tight text-white font-mono">404</div>
          <h1 className="text-2xl font-extrabold text-white">Out of Bounds!</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            The court or route you are looking for does not exist or has been relocated to another part of the club facility.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary" size="md" startIcon={<Home className="w-4 h-4" />}>
              Back to Home
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="outline" size="md" startIcon={<Trophy className="w-4 h-4" />}>
              Member App
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
