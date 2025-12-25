'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { signUp, signIn } from '@/lib/supabase-auth';
import Spinner from '@/components/ui/spinner';
import { User, Lock, Sparkles, ArrowRight, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthDialog({ isOpen, onClose, onSuccess }: AuthDialogProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  const validateUsername = (name: string): string | null => {
    if (name.length < 3) return 'Username must be at least 3 characters';
    if (name.length > 20) return 'Username must be 20 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Only letters, numbers, and underscores allowed';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);
    const authFn = isSignUp ? signUp : signIn;
    const { error: authError } = await authFn(username, password);
    setIsLoading(false);

    if (authError) {
      setError(authError.message || 'Authentication failed');
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 bg-[#0A0A0A] border-[#1F1F1F] text-white overflow-hidden shadow-2xl shadow-black/50 rounded-2xl">
        <VisuallyHidden.Root>
          <DialogTitle>Authentication</DialogTitle>
        </VisuallyHidden.Root>

        <div className="relative overflow-hidden p-8">
          {/* Background Ambient Glow */}
          <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[100%] bg-gradient-to-b from-[#3ECF8E]/10 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center mb-8">
            <div className="h-12 w-12 bg-gradient-to-br from-[#3ECF8E] to-[#2DA770] rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-[#3ECF8E]/20 ring-1 ring-[#3ECF8E]/40">
              <Sparkles className="h-6 w-6 text-[#0A0A0A]" />
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 'signup-header' : 'signin-header'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {isSignUp ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  {isSignUp ? 'Join the community today' : 'Enter your credentials to continue'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#3ECF8E] transition-colors" />
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-[#161616] border-[#2A2A2A] text-white placeholder:text-gray-600 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-[#3ECF8E] focus-visible:border-[#3ECF8E] transition-all"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#3ECF8E] transition-colors" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#161616] border-[#2A2A2A] text-white placeholder:text-gray-600 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-[#3ECF8E] focus-visible:border-[#3ECF8E] transition-all"
                />
              </div>

              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-[#3ECF8E] transition-colors" />
                      <Input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 bg-[#161616] border-[#2A2A2A] text-white placeholder:text-gray-600 h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-[#3ECF8E] focus-visible:border-[#3ECF8E] transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"
                >
                  <p className="text-xs font-medium text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-[#3ECF8E] to-[#2DA770] hover:from-[#35b37b] hover:to-[#269061] text-[#0A0A0A] font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#3ECF8E]/25"
            >
              {isLoading ? (
                <Spinner size="sm" className="border-[#0A0A0A]/30 border-t-[#0A0A0A]" />
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#1F1F1F] text-center">
            <p className="text-sm text-gray-500 mb-2">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={toggleMode}
              className="text-[#3ECF8E] text-sm font-medium hover:text-[#4fffae] transition-colors hover:underline decoration-2 underline-offset-4"
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
