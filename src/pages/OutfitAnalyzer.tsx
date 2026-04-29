import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, X, Loader2, Camera, Sparkles, Wand2, RefreshCw, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

const occasions = ["Work / Office", "Date Night", "Casual Day Out", "Party / Club", "Wedding / Formal", "Travel", "Gym / Activewear", "Interview"];
const seasons = ["Spring", "Summer", "Autumn", "Winter"];
const contexts = ["Rate my outfit", "Suggest best combinations", "What should I pair this with?", "Is this appropriate for the occasion?"];
const palettes = ["Neutrals", "Pastels", "Bold & Bright", "Earth Tones", "Monochrome", "Jewel Tones"];
const vibes = ["Minimalist", "Streetwear", "Bohemian", "Classic", "Edgy", "Romantic"];

interface GeneratedOutfit {
  text: string;
  imageUrl?: string;
}

const OutfitAnalyzer = () => {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Generator state (rendered after analysis)
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [palette, setPalette] = useState("");
  const [vibe, setVibe] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [outfit, setOutfit] = useState<GeneratedOutfit | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 5 - images.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    if (newImages.length === 0) {
      toast({ title: "Please upload image files only", variant: "destructive" });
      return;
    }
    setImages((prev) => [...prev, ...newImages].slice(0, 5));
    setAnalysis(null);
    setOutfit(null);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const analyzeStyle = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setAnalysis(null);
    setOutfit(null);

    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        const ext = img.file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("outfit-uploads")
          .upload(path, img.file, { contentType: img.file.type });

        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("outfit-uploads").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const { data, error } = await supabase.functions.invoke("analyze-outfit", {
        body: { imageUrls, occasion, season, context },
      });

      if (error) throw error;
      setAnalysis(data.analysis);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e.message || "Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  // After analysis is ready, scroll into the inline generator
  useEffect(() => {
    if (analysis) {
      setTimeout(() => generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [analysis]);

  const generateOutfit = async () => {
    if (!gender || !occasion || !season) {
      toast({ title: "Pick gender, occasion & season", description: "Required to generate a tailored outfit.", variant: "destructive" });
      return;
    }
    setGenLoading(true);
    setOutfit(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-outfit", {
        body: {
          occasion,
          season,
          palette,
          vibe,
          gender,
          // Pass analysis as additional context (edge fn ignores unknown fields safely)
          analysisContext: analysis,
        },
      });

      if (error) {
        const errBody = data || {};
        if (errBody.error === "Payment required") {
          setOutfit({ text: "⚠️ **AI credits exhausted.** Please add credits to continue generating outfits." });
        } else if (errBody.error === "Rate limit exceeded") {
          setOutfit({ text: "⚠️ **Too many requests.** Please wait a moment and try again." });
        } else {
          throw error;
        }
        return;
      }
      setOutfit({ text: data.text, imageUrl: data.imageUrl });
    } catch (e) {
      console.error(e);
      setOutfit({ text: "Something went wrong. Please try again!" });
    }
    setGenLoading(false);
  };

  const saveOutfit = () => {
    if (!outfit) return;
    const saved = JSON.parse(localStorage.getItem("stylesense-lookbook") || "[]");
    saved.unshift({ ...outfit, occasion, season, palette, vibe, savedAt: new Date().toISOString() });
    localStorage.setItem("stylesense-lookbook", JSON.stringify(saved));
    toast({ title: "Saved to Lookbook ✨" });
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Camera className="h-4 w-4" />
            AI Outfit Analyzer
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Get Expert Styling Feedback</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Upload photos of your outfit — get full styling advice, then generate a brand-new look tailored to your analysis.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center mb-6 hover:border-accent/40 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground">Up to 5 images • JPG, PNG, WEBP</p>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group"
              >
                <img src={img.preview} alt={`Outfit ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Full Analysis Options */}
        <div className="space-y-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Occasion</label>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger><SelectValue placeholder="What's the occasion?" /></SelectTrigger>
                <SelectContent>{occasions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger><SelectValue placeholder="What season?" /></SelectTrigger>
                <SelectContent>{seasons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">What do you want?</label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger><SelectValue placeholder="Pick feedback type" /></SelectTrigger>
                <SelectContent>{contexts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={analyzeStyle}
              disabled={images.length === 0 || loading}
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? "Analyzing your look..." : "Analyze My Outfit"}
            </Button>
          </div>
        </div>

        {/* Analysis Output */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-accent/10">
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Inline Outfit Generator (appears after analysis) ── */}
        {analysis && (
          <motion.div
            ref={generatorRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3">
                <Wand2 className="h-4 w-4" />
                Next Step
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Generate a Tailored Outfit</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Using your analysis above as context — pick a few preferences and we'll craft a fresh look.
              </p>
            </div>

            {/* Gender toggle */}
            <div className="flex justify-center gap-3 mb-6">
              <Button variant={gender === "female" ? "default" : "outline"} onClick={() => setGender("female")} className="rounded-full px-6">
                👩 Female
              </Button>
              <Button variant={gender === "male" ? "default" : "outline"} onClick={() => setGender("male")} className="rounded-full px-6">
                👨 Male
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Occasion</label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>{occasions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>{seasons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Color Palette</label>
                <Select value={palette} onValueChange={setPalette}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{palettes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Style Vibe</label>
                <Select value={vibe} onValueChange={setVibe}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{vibes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center gap-3 mb-10">
              <Button
                onClick={generateOutfit}
                disabled={!gender || !occasion || !season || genLoading}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8"
              >
                {genLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Outfit
              </Button>
              {outfit && (
                <Button variant="outline" onClick={generateOutfit} className="rounded-full" disabled={genLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                </Button>
              )}
            </div>

            {outfit && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden border-accent/10">
                  {outfit.imageUrl && (
                    <div className="aspect-video bg-secondary">
                      <img src={outfit.imageUrl} alt="AI generated outfit" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                      <ReactMarkdown>{outfit.text}</ReactMarkdown>
                    </div>
                    <Button onClick={saveOutfit} variant="outline" className="rounded-full">
                      <Heart className="h-4 w-4 mr-2" /> Save to Lookbook
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OutfitAnalyzer;
