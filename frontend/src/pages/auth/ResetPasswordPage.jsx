import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Check, CheckCircle2, Lock, ShieldAlert, X } from 'lucide-react';
import apiClient from '../../api/client';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Password policy checks
  const hasLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isPolicyValid = hasLength && hasLetter && hasNumber;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorMessage('Reset token is required.');
      return;
    }

    if (!isPolicyValid) {
      setErrorMessage('Password does not satisfy the security policy requirements.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await apiClient.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password.';
      setErrorMessage(msg);
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
              Create New Password
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Enter your reset verification token and choose a strong password
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 stroke-1.5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Password Updated</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your password has been changed. All existing sessions have been safely invalidated.
                  </p>
                </div>
                <Link to="/login" className="block pt-2">
                  <Button variant="primary" className="w-full">
                    Sign In With New Password
                  </Button>
                </Link>
              </div>
            ) : (
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
                  label="Verification Token"
                  type="text"
                  placeholder="Paste reset token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  startIcon={<Lock className="w-4 h-4" />}
                  required
                />

                {/* Policy Checklist */}
                <div className="p-3 rounded-2xl bg-surface-900/60 border border-slate-800 space-y-1.5 text-xs text-slate-400">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Security Requirements</div>
                  <div className={`flex items-center gap-2 ${hasLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>At least 8 characters long</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasLetter ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasLetter ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Contains at least one letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Contains at least one number</span>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>Passwords match</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isLoading}
                  disabled={!isPolicyValid || !passwordsMatch || !token.trim()}
                >
                  Save New Password
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-800/80 pt-4">
            <Link to="/login" className="text-xs text-slate-400 hover:text-white transition">
              Cancel & Return to Sign In
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
