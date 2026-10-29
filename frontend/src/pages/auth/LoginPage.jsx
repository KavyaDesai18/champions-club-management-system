import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get('email');
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect');
  const shouldReduceMotion = useReducedMotion();

  // If already authenticated, redirect to appropriate console/portal
  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirect) {
        navigate(decodeURIComponent(redirect), { replace: true });
      } else if (['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(user.role)) {
        navigate('/console', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [isAuthenticated, user, redirect, navigate]);

  // Sync if prefillEmail changes
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail]);

  const handleDemoFill = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Champions@123');
    if (demoRole) {
      setRole(demoRole);
    }
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
      const authUser = await login(email, password, role);
      if (redirect) {
        navigate(decodeURIComponent(redirect), { replace: true });
      } else if (['OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'KITCHEN', 'COACH'].includes(authUser.role)) {
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
                className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-slate-800 text-cyan-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('alice.frontdesk@championsclub.com', 'FRONT_DESK')}
                className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-slate-800 text-blue-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Front Desk
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('kitchen@championsclub.com', 'KITCHEN')}
                className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Kitchen
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('sania.mirza@championsclub.demo', 'MEMBER')}
                className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-slate-800 text-emerald-300 hover:bg-slate-700 transition border border-slate-700/80"
              >
                Member / Athlete
              </button>
            </div>
          </div>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {prefillEmail && !errorMessage && (
                <div
                  role="status"
                  className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="flex-1 font-medium">Welcome back! Enter your password to sign in.</span>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-rose-200">Access Denied</div>
                    <div className="font-medium text-rose-300 leading-relaxed">{errorMessage}</div>
                  </div>
                </div>
              )}

              {/* Role Selection Field */}
              <div className="space-y-1.5">
                <label htmlFor="login-role" className="block text-xs font-semibold text-slate-300">
                  Select Your Role <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <select
                    id="login-role"
                    aria-label="Select your role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl text-xs font-heading font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition appearance-none cursor-pointer"
                  >
                    <option value="MEMBER">MEMBER (Athlete / Club Member)</option>
                    <option value="OWNER">OWNER (Club Owner / Executive)</option>
                    <option value="MANAGER">MANAGER (Club Operations Manager)</option>
                    <option value="FRONT_DESK">FRONT_DESK (Reception & Check-in)</option>
                    <option value="COACH">COACH (Head Coach & Trainer)</option>
                    <option value="SHOP_STAFF">SHOP_STAFF (Pro Shop & Merchandise)</option>
                    <option value="BAR_STAFF">BAR_STAFF (Lounge & Beverage Staff)</option>
                    <option value="KITCHEN">KITCHEN (Kitchen Chef & KDS)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  System verifies that your account is registered for this specific role.
                </p>
              </div>

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

          <CardFooter className="flex flex-col gap-2 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-xs text-slate-400">
              New athlete?{' '}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition">
                Create an account / Register here
              </Link>
            </p>
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
