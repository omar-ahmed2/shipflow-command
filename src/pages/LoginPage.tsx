import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Mail, Lock, Eye, EyeOff, Truck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

const LoginBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute top-1/4 -start-20 w-80 h-80 rounded-full bg-primary/8 blur-3xl"
      animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-1/4 -end-20 w-80 h-80 rounded-full bg-accent/8 blur-3xl"
      animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/2 start-1/3 w-40 h-40 rounded-full bg-success/5 blur-3xl"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full bg-primary/20"
        style={{
          top: `${15 + i * 14}%`,
          left: `${10 + (i % 3) * 35}%`,
        }}
        animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }}
        transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
      />
    ))}
  </div>
);

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const success = login(email, password);
    setLoading(false);
    if (!success) {
      setError(t.loginError);
      return;
    }
    const users = JSON.parse(localStorage.getItem('shipflow_users') || '[]');
    const user = users.find((u: any) => u.email === email);
    if (user?.role === 'courier') {
      navigate('/courier');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--background)) 100%)'
      }}
    >
      <LoginBackground />

      <motion.div
        className="relative w-full max-w-[420px]"
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-5xl font-black tracking-tighter text-foreground leading-none">
              ELMona
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="h-[2px] w-8 bg-gradient-to-r from-transparent to-primary/50" />
              <span className="text-primary font-black text-sm uppercase tracking-[0.5em]">
                Shipping
              </span>
              <div className="h-[2px] w-8 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
          </motion.div>
        </motion.div>

        {/* Card */}
        <motion.div
          className="glass-card p-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{
            boxShadow: '0 25px 60px -15px hsl(var(--primary) / 0.1), 0 0 0 1px hsl(var(--border))'
          }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">{t.welcomeBack}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t.loginDesc}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`ps-10 rounded-xl h-11 transition-all focus:ring-2 focus:ring-primary/20 ${error ? 'border-destructive' : ''}`}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`ps-10 pe-10 rounded-xl h-11 transition-all focus:ring-2 focus:ring-primary/20 ${error ? 'border-destructive' : ''}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(!!c)} />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">{t.rememberMe}</label>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.loginButton}
              </Button>
            </motion.div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">{t.contactAdmin}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
