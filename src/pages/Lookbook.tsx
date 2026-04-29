import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SavedOutfitRow {
  id: string;
  name: string;
  description: string | null;
  occasion: string | null;
  season: string | null;
  ai_generated_text: string | null;
  image_url: string | null;
  created_at: string;
}

const Lookbook = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [outfits, setOutfits] = useState<SavedOutfitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const { data, error } = await supabase
        .from("saved_outfits")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setOutfits(data as SavedOutfitRow[]);
      setLoading(false);
    };
    load();

    // Live updates when new outfits get auto-saved
    const channel = supabase
      .channel("lookbook-saved-outfits")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "saved_outfits", filter: `user_id=eq.${user.id}` },
        (payload) => setOutfits((prev) => [payload.new as SavedOutfitRow, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_outfits").delete().eq("id", id);
    if (error) { toast({ title: "Couldn't delete", variant: "destructive" }); return; }
    setOutfits((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Your Lookbook</h1>
          <p className="text-muted-foreground">Every AI-generated outfit auto-saves here.</p>
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : !user ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Sign in to view your lookbook</h2>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full mt-3">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">No saved looks yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Generate an outfit and it will appear here automatically.</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
              <Link to="/analyzer">Go to Outfit Analyzer</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit, i) => (
              <motion.div key={outfit.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <Card className="overflow-hidden group">
                  {outfit.image_url && (
                    <div className="aspect-[4/3] bg-secondary">
                      <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-display font-semibold mb-2 line-clamp-1">{outfit.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {outfit.occasion && <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">{outfit.occasion}</span>}
                      {outfit.season && <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">{outfit.season}</span>}
                    </div>
                    {outfit.ai_generated_text && (
                      <div className="prose prose-xs max-w-none dark:prose-invert line-clamp-4 mb-3 text-sm">
                        <ReactMarkdown>{outfit.ai_generated_text}</ReactMarkdown>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {new Date(outfit.created_at).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => remove(outfit.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lookbook;
