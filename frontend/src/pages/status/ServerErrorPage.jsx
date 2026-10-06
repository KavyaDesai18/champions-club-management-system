import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';

export const ServerErrorPage = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <motion.div
          initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-24 h-24 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/20"
        >
          <AlertTriangle className="w-12 h-12 stroke-1.5" />
        </motion.div>

        <div className="space-y-2">
          <div className="text-6xl font-black tracking-tight text-white font-mono">500</div>
          <h1 className="text-2xl font-extrabold text-white">System Technical Foul</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            The club backend experienced an internal disruption. Our engineering team has been notified with the trace identifier.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            startIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry Request
          </Button>
          <Link to="/">
            <Button variant="outline" size="md" startIcon={<Home className="w-4 h-4" />}>
              Home Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
