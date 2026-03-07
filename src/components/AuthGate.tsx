import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Global authentication gate.
 * Wraps protected routes — redirects to /auth if user is not signed in.
 * Reuses the existing Supabase-based AuthProvider (no new auth logic).
 */
const AuthGate = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    /* ── still checking session → elegant full-screen loader ── */
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                >
                    <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-blush flex items-center justify-center shadow-lg shadow-accent/25">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                </motion.div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading StyleSense…
                </div>
            </div>
        );
    }

    /* ── not authenticated → redirect to login page ── */
    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    /* ── authenticated → render the app ── */
    return <>{children}</>;
};

export default AuthGate;
