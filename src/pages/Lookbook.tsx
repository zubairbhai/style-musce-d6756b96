import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface SavedOutfit {
  text: string;
  imageUrl?: string;
  occasion: string;
  season: string;
  palette: string;
  vibe: string;
  savedAt: string;
}

const Lookbook = () => {
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("stylesense-lookbook") || "[]");
    setOutfits(saved);
  }, []);

  const remove = (index: number) => {
    const updated = outfits.filter((_, i) => i !== index);
    setOutfits(updated);
    localStorage.setItem("stylesense-lookbook", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Your Lookbook</h1>
          <p className="text-muted-foreground">All your saved outfit inspirations in one place.</p>
        </div>

        {outfits.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">No saved looks yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Generate outfits and save your favorites here.</p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
              <Link to="/generator">Go to Outfit Generator</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden group">
                  {outfit.imageUrl && (
                    <div className="aspect-[4/3] bg-secondary">
                      <img src={outfit.imageUrl} alt="Saved outfit" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">{outfit.occasion}</span>
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">{outfit.season}</span>
                    </div>
                    <div className="prose prose-xs max-w-none dark:prose-invert line-clamp-4 mb-3">
                      <ReactMarkdown>{outfit.text}</ReactMarkdown>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {new Date(outfit.savedAt).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
