import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import apiClient from '../../api/client';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setIsSubmitted(true);
    } catch {
      // Always show success message to prevent user enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-slate-800 shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Award className="w-6 h-6 text-slate-950" />
            </div>
            <CardTitle className="text-2xl font-black text-white tracking-tight">
              Password Recovery
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your registered club email to receive secure recovery instructions
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSubmitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 stroke-1.5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Instructions Dispatched</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    If an account is associated with <span className="text-emerald-400 font-semibold">{email}</span>, a secure password reset link has been dispatched.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    (In local development, check backend console logs for the reset link token)
                  </p>
                </div>
                <Link to="/login" className="block pt-2">
                  <Button variant="primary" className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="name@championsclub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  startIcon={<Mail className="w-4 h-4" />}
                  required
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                  endIcon={<Send className="w-4 h-4" />}
                >
                  Send Recovery Link
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-800/80 pt-4">
            <Link to="/login" className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
