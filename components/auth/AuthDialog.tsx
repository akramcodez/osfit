'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { signUp, signIn } from '@/lib/supabase-auth';
import Spinner from '@/components/ui/spinner';
import { User, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthDialog({ isOpen, onClose, onSuccess, initialMode = 'signin' }: AuthDialogProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setIsSignUp(initialMode === 'signup');
    }
  }, [isOpen, initialMode]);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
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
      <DialogContent className="sm:max-w-[380px] p-0 bg-[#111111] border-[#222222] text-white overflow-hidden rounded-xl">
        <VisuallyHidden.Root>
          <DialogTitle>Authentication</DialogTitle>
        </VisuallyHidden.Root>

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 'signup-header' : 'signin-header'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="text-center"
              >
                <h2 className="text-xl font-semibold text-white">
                  {isSignUp ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isSignUp ? 'Join the community' : 'Enter your credentials'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-500 h-10 rounded-lg focus-visible:ring-0 focus-visible:border-[#3ECF8E] transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-500 h-10 rounded-lg focus-visible:ring-0 focus-visible:border-[#3ECF8E] transition-colors"
              />
            </div>

            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative pt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-[#1A1A1A] border-[#2A2A2A] text-white placeholder:text-gray-500 h-10 rounded-lg focus-visible:ring-0 focus-visible:border-[#3ECF8E] transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-center"
                >
                  <p className="text-xs text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#166534] border border-[#22c55e] hover:bg-[#15803d] text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <Spinner size="sm" className="border-black/30 border-t-black" />
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#222222] text-center">
            <p className="text-xs text-gray-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={toggleMode}
                className="text-[#3ECF8E] font-medium hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
