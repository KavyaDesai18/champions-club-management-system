import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const shouldReduceMotion = useReducedMotion();

  const handleDemoFill = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Champions@123');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const user = await login(email, password);
      if (redirect) {
        navigate(decodeURIComponent(redirect), { replace: true });
      } else if (['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(user.role)) {
        navigate('/console', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid email or password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-slate-800 shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-2">
            <Link to="/" className="inline-flex items-center justify-center gap-2.5 mx-auto group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6 text-slate-950" />
              </div>
            </Link>
            <CardTitle className="text-2xl font-black text-white tracking-tight">
              Sign In to Champions Club
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Access member portal, court bookings, and staff management
            </CardDescription>
          </CardHeader>

          {/* Quick Demo Credential Pills */}
          <div className="px-6 py-2 border-y border-slate-800/80 bg-surface-900/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
              Quick Demo Fill
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoFill('owner@championsclub.com', 'OWNER')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('manager@testclub.com', 'MANAGER')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('member@testclub.com', 'MEMBER')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Member
              </button>
            </div>
          </div>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="flex-1 font-medium">{errorMessage}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                id="login-email"
                placeholder="name@championsclub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
                autoFocus
              />

              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="text-slate-400 hover:text-slate-200 transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
                id="login-submit-btn"
                endIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-800/80 pt-4">
            <Link to="/" className="text-xs text-slate-400 hover:text-white transition">
              ← Back to Club Home
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
