import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';

export const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter a password.');
      return;
    }
    if (!hasMinLength || !hasUpper || !hasLower || !hasNumberOrSymbol) {
      setErrorMessage('Please ensure your password meets all security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await register({
        fullName,
        email,
        phone,
        password,
      });
      // Automatically redirect to member dashboard upon successful registration
      navigate('/app', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please check your details and try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-court-950 relative overflow-hidden">
      {/* Background Court Geometry & Line Accents */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] border border-white/20 rounded-full" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
      </div>

      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg relative z-10 py-8"
      >
        <Card className="bg-court-900 border-court-800 shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-2">
            <Link to="/" className="inline-flex items-center justify-center gap-2.5 mx-auto group">
              <div className="w-12 h-12 rounded-xl bg-optic-500 flex items-center justify-center shadow-lg shadow-optic-500/20 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6 text-court-950" />
              </div>
            </Link>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-optic-500/10 border border-optic-500/20 text-optic-400 text-[11px] font-heading font-bold uppercase tracking-wider mx-auto">
              <Sparkles className="w-3.5 h-3.5" />
              Join Champions Club
            </div>
            <CardTitle className="text-2xl font-heading font-black uppercase text-white tracking-tight">
              Create Athlete Account
            </CardTitle>
            <CardDescription className="text-xs text-court-400">
              Sign up for court bookings, social play sessions, and club tournaments
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-danger-500/15 border border-danger-500/30 text-danger-300 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-danger-400 mt-0.5" />
                  <span className="flex-1 font-medium">{errorMessage}</span>
                </div>
              )}

              <Input
                label="Full Name"
                type="text"
                id="register-fullname"
                placeholder="e.g. Sania Mirza"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                startIcon={<User className="w-4 h-4" />}
                required
                autoComplete="name"
                autoFocus
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  id="register-email"
                  placeholder="athlete@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  startIcon={<Mail className="w-4 h-4" />}
                  required
                  autoComplete="email"
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  id="register-phone"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  startIcon={<Phone className="w-4 h-4" />}
                  autoComplete="tel"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="text-court-400 hover:text-white transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  id="register-confirm-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Password Strength Checklist */}
              {password && (
                <div className="p-3 rounded-lg bg-court-800/60 border border-court-700/60 space-y-1.5 text-[11px]">
                  <div className="font-heading font-bold uppercase text-court-400 tracking-wider">
                    Password Requirements:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-success-400' : 'text-court-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-success-400' : 'text-court-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>1 uppercase</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLower ? 'text-success-400' : 'text-court-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>1 lowercase</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-success-400' : 'text-court-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>1 number or symbol</span>
                    </div>
                  </div>
                  {confirmPassword && (
                    <div className={`pt-1 border-t border-court-700/50 flex items-center gap-1.5 ${passwordsMatch ? 'text-success-400' : 'text-danger-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-3 bg-optic-500 hover:bg-optic-400 text-court-950 font-heading font-black tracking-wider uppercase"
                isLoading={isLoading}
                id="register-submit-btn"
                endIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account & Join
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t border-court-800 pt-4 text-center">
            <p className="text-xs text-court-400">
              Already have an account?{' '}
              <Link to="/login" className="text-optic-400 hover:text-optic-300 font-bold transition">
                Sign In here
              </Link>
            </p>
            <Link to="/" className="text-xs text-court-500 hover:text-white transition">
              ← Back to Club Home
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
