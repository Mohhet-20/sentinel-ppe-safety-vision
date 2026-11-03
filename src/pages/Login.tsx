import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldHalf, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { API_BASE, AuthError } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo/demo-mode";
import { useLaunchDemo } from "@/hooks/use-launch-demo";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The seeded demo administrator (see backend/app/services/seed.py).
const DEMO_IDENTIFIER = "admin";
const DEMO_PASSWORD = "ChangeMe123!";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const { launch } = useLaunchDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app";

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email) next.email = "Work email is required.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function authenticate(identifier: string, secret: string) {
    setLoading(true);
    try {
      const profile = await login(identifier, secret);
      toast({
        title: `Welcome back, ${profile.full_name?.split(" ")[0] ?? profile.username}`,
        description: "Authenticated successfully.",
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message =
        err instanceof AuthError && err.status === 401
          ? "Incorrect email or password."
          : "Could not reach the authentication service. Is the backend running?";
      toast({ variant: "destructive", title: "Sign-in failed", description: message });
      setErrors((e) => ({ ...e, password: message }));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    void authenticate(email, password);
  }

  async function handleDemoLogin() {
    setEmail("admin@sentinel-ai.com");
    setPassword(DEMO_PASSWORD);
    setErrors({});
    if (isDemoMode()) {
      await launch(redirectTo);
      return;
    }
    // Prefer a real backend; if none is reachable, fall back to the in-browser demo.
    setLoading(true);
    const reachable = await fetch(`${API_BASE}/health`).then((r) => r.ok, () => false);
    setLoading(false);
    if (reachable) {
      void authenticate(DEMO_IDENTIFIER, DEMO_PASSWORD);
    } else {
      toast({ title: "No backend detected", description: "Switched to the self-contained browser demo." });
      await launch(redirectTo);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ambient px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-detect/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="hud-panel relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card/70 p-7 shadow-panel backdrop-blur-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <ShieldHalf className="h-6 w-6 text-primary" strokeWidth={2.25} />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-success shadow-glow-detect" />
          </div>
          <h1 className="font-display text-xl font-bold tracking-wide text-foreground">SENTINEL</h1>
          <p className="mt-1 text-xs text-muted-foreground">AI Workplace Safety Platform</p>
          <Badge variant="secondary" className="mt-3 font-sans normal-case">
            Enterprise Access
          </Badge>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border bg-secondary/40 pl-9 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  errors.email ? "border-danger" : "border-border",
                )}
              />
            </div>
            {errors.email && (
              <p className="flex items-center gap-1 text-[11px] text-danger">
                <AlertCircle className="h-3 w-3" /> {errors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => toast({ title: "Reset link sent", description: "Check your inbox for password reset instructions." })}
                className="text-[11px] text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border bg-secondary/40 pl-9 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  errors.password ? "border-danger" : "border-border",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 text-[11px] text-danger">
                <AlertCircle className="h-3 w-3" /> {errors.password}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
            Remember me on this device
          </label>

          <Button type="submit" disabled={loading} className="mt-1 h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Authenticating…" : "Sign in"}
          </Button>

          <div className="relative flex items-center py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="px-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="detect" disabled={loading} onClick={() => void handleDemoLogin()} className="h-10">
            <Sparkles className="h-4 w-4" />
            Continue with demo account
          </Button>
        </form>

        <div className="mt-5 flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <p className="text-[10px] text-muted-foreground">
            Secured by JWT — credentials are verified against the Sentinel backend.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
