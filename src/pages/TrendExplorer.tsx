import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

const categories = ["Seasonal", "Street Style", "Workwear", "Evening"];

interface TrendItem {
  title: string;
  description: string;
  imageUrl?: string;
}

const TrendExplorer = () => {
  const [selectedCategory, setSelectedCategory] = useState("Seasonal");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrends = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    setTrends([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-trends", {
        body: { category },
      });

      if (error) throw error;
      setTrends(data.trends || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Trend Explorer</h1>
          <p className="text-muted-foreground">Discover what's hot in fashion right now, powered by AI.</p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => fetchTrends(cat)}
              className={`rounded-full ${selectedCategory === cat ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
              disabled={loading}
            >
              {cat}
            </Button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Discovering trends...</p>
          </div>
        )}

        {!loading && trends.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Explore Trends</h2>
            <p className="text-muted-foreground text-sm">Pick a category above to discover AI-curated fashion trends.</p>
          </div>
        )}

        {trends.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {trends.map((trend, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="overflow-hidden h-full">
                  {trend.imageUrl && (
                    <div className="aspect-video bg-secondary">
                      <img src={trend.imageUrl} alt={trend.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-display text-lg font-semibold mb-2">{trend.title}</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground">
                      <ReactMarkdown>{trend.description}</ReactMarkdown>
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

export default TrendExplorer;
