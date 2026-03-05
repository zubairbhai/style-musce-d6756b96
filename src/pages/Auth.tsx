import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Star,
  Zap,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import ShaderBackground from "@/components/ui/shader-background";

/* ─────────────────────── (shader background is now a separate component) ─── */

/* ─────────────────────── feature badges ─────────────────────────── */
const features = [
  { icon: Star, label: "AI Styling" },
  { icon: Zap, label: "Instant Analysis" },
  { icon: TrendingUp, label: "Trend Insights" },
  { icon: Sparkles, label: "Smart Wardrobe" },
];

/* ─────────────────────── main component ─────────────────────────── */
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  /* ── auth handler — reuses existing supabase calls ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── toggle mode with form reset ── */
  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* WebGL neon golden wave background */}
      <ShaderBackground />

      <div className="relative z-10 w-full max-w-[460px]">
        {/* ──── header with animated icon ──── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-8"
        >
          <motion.div
            className="relative w-16 h-16 mx-auto mb-5"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/30 to-blush/30 blur-xl" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-blush flex items-center justify-center shadow-lg shadow-accent/25">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login-head" : "signup-head"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
                {isLogin ? "Welcome Back" : "Join StyleSense"}
              </h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                {isLogin
                  ? "Sign in to your wardrobe & unlock AI-powered style"
                  : "Create your account for personalized fashion intelligence"}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ──── main card ──── */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* glassmorphism border glow */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-yellow-500/30 via-white/10 to-amber-500/20 pointer-events-none" />

          <div className="relative rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 p-8 shadow-2xl shadow-yellow-500/10">
            {/* ── tab switcher ── */}
            <div className="relative flex mb-8 bg-muted/60 rounded-2xl p-1">
              <motion.div
                className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-accent to-accent/80 shadow-md shadow-accent/30"
                layout
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                style={{ width: "calc(50% - 4px)", left: isLogin ? 4 : "calc(50%)" }}
              />
              {[
                { key: "login", label: "Sign In" },
                { key: "signup", label: "Sign Up" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    if ((tab.key === "login") !== isLogin) toggleMode();
                  }}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 ${(tab.key === "login") === isLogin
                    ? "text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── form ── */}
            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? "login" : "signup"}
                initial={{ opacity: 0, x: isLogin ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 24 : -24 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* name field (signup only) */}
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <label
                      htmlFor="auth-name"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Display Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/20 to-blush/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity -z-10" />
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                      <input
                        id="auth-name"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/40 transition-all duration-200"
                      />
                    </div>
                  </motion.div>
                )}

                {/* email */}
                <div className="space-y-2">
                  <label
                    htmlFor="auth-email"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/20 to-blush/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity -z-10" />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/40 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* password */}
                <div className="space-y-2">
                  <label
                    htmlFor="auth-password"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/20 to-blush/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity -z-10" />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      className="w-full pl-11 pr-12 py-3 rounded-xl bg-muted/50 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/40 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* submit button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full py-3.5 rounded-2xl font-semibold text-sm overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {/* button gradient bg */}
                  <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent to-blush transition-all duration-300 group-hover:brightness-110" />
                  {/* shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isLogin ? "Sign In" : "Create Account"}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* ── divider ── */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-xs text-muted-foreground/60">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ── toggle text ── */}
            <motion.button
              onClick={toggleMode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full text-center text-sm text-muted-foreground hover:text-accent transition-colors duration-200"
            >
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="font-semibold text-accent">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="font-semibold text-accent">Sign in</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ──── feature badges ──── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex items-center justify-center gap-3 mt-8 flex-wrap"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              whileHover={{ scale: 1.08, y: -2 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur border border-white/10 text-xs text-muted-foreground"
            >
              <f.icon className="h-3 w-3 text-accent" />
              {f.label}
            </motion.div>
          ))}
        </motion.div>

        {/* ──── footer ──── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-[11px] text-muted-foreground/40 mt-6"
        >
          By continuing, you agree to our Terms of Service &amp; Privacy Policy
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;
