import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, X, Loader2, Camera, Sparkles, Wand2, RefreshCw, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const occasions = ["Work / Office", "Date Night", "Casual Day Out", "Party / Club", "Wedding / Formal", "Travel", "Gym / Activewear", "Interview"];
const seasons = ["Spring", "Summer", "Autumn", "Winter"];
const contexts = ["Rate my outfit", "Suggest best combinations", "What should I pair this with?", "Is this appropriate for the occasion?"];
const palettes = ["Neutrals", "Pastels", "Bold & Bright", "Earth Tones", "Monochrome", "Jewel Tones"];
const vibes = ["Minimalist", "Streetwear", "Bohemian", "Classic", "Edgy", "Romantic"];

interface Analysis {
  is_human: boolean;
  detected_object?: string;
  skin_tone?: string;
  body_type?: string;
  gender_presentation?: string;
  outfit?: {
    upper_wear?: string;
    bottom_wear?: string;
    footwear?: string;
    outerwear?: string;
    accessories?: string[];
    dominant_colors?: string[];
  };
  rating?: number;
  verdict?: string;
  what_works?: string[];
  improvements?: string[];
  styling_tips?: string[];
  alternative_pieces?: string[];
}

interface JobRow {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  output_text: string | null;
  output_image_url: string | null;
  error: string | null;
}

const OutfitAnalyzer = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  // Generator state
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [palette, setPalette] = useState("");
  const [vibe, setVibe] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [job, setJob] = useState<JobRow | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Restore active job on mount (survives refresh)
  useEffect(() => {
    if (!user) return;
    const activeId = localStorage.getItem("active-generation-job");
    if (activeId) {
      supabase.from("generation_jobs").select("*").eq("id", activeId).maybeSingle()
        .then(({ data }) => { if (data) setJob(data as JobRow); });
    }
  }, [user]);

  // Subscribe to job updates (realtime)
  useEffect(() => {
    if (!job?.id || job.status === "completed" || job.status === "failed") return;
    const channel = supabase
      .channel(`job-${job.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "generation_jobs", filter: `id=eq.${job.id}` },
        (payload) => setJob(payload.new as JobRow))
      .subscribe();

    // Poll fallback every 4s in case realtime drops
    const pollId = setInterval(async () => {
      const { data } = await supabase.from("generation_jobs").select("*").eq("id", job.id).maybeSingle();
      if (data) setJob(data as JobRow);
    }, 4000);

    return () => { supabase.removeChannel(channel); clearInterval(pollId); };
  }, [job?.id, job?.status]);

  // Clean up job tracking when finished
  useEffect(() => {
    if (job?.status === "completed" || job?.status === "failed") {
      localStorage.removeItem("active-generation-job");
      if (job.status === "completed") {
        toast({ title: "Outfit ready ✨", description: "Saved to your Wardrobe & Lookbook." });
      } else if (job.status === "failed") {
        toast({ title: "Generation failed", description: job.error || "Try again", variant: "destructive" });
      }
    }
  }, [job?.status]);

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

    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        const ext = img.file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("outfit-uploads").upload(path, img.file, { contentType: img.file.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("outfit-uploads").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      const { data, error } = await supabase.functions.invoke("analyze-outfit", {
        body: { imageUrls, occasion, season, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.structured as Analysis);

      // Auto-derive gender if detected
      if (data.structured?.gender_presentation === "male") setGender("male");
      else if (data.structured?.gender_presentation === "female") setGender("female");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e.message || "Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (analysis) {
      setTimeout(() => generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [analysis]);

  const generateOutfit = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "Sign in to generate & save outfits.", variant: "destructive" });
      return;
    }
    if (!gender || !occasion || !season) {
      toast({ title: "Pick gender, occasion & season", variant: "destructive" });
      return;
    }
    setJob({ id: "pending", status: "pending", output_text: null, output_image_url: null, error: null });

    try {
      const { data, error } = await supabase.functions.invoke("generate-outfit", {
        body: {
          occasion, season, palette, vibe, gender,
          specifications,
          analysisContext: analysis ? JSON.stringify(analysis) : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.jobId) {
        localStorage.setItem("active-generation-job", data.jobId);
        setJob({ id: data.jobId, status: "pending", output_text: null, output_image_url: null, error: null });
      }
    } catch (e: any) {
      console.error(e);
      setJob(null);
      toast({ title: "Couldn't start generation", description: e.message, variant: "destructive" });
    }
  };

  const isGenerating = job && (job.status === "pending" || job.status === "processing");
  const generated = job?.status === "completed" ? job : null;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            <Camera className="h-4 w-4" /> AI Outfit Analyzer
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Get Expert Styling Feedback</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Upload photos — we detect the human, outfit, skin tone & body type, then generate a tailored new look.
          </p>
        </div>

        {/* Upload */}
        <div
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center mb-6 hover:border-accent/40 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground">Up to 5 images • JPG, PNG, WEBP</p>
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {images.map((img, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
                <img src={img.preview} alt={`Outfit ${i + 1}`} className="w-full h-full object-cover" />
                <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

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
            <Button onClick={analyzeStyle} disabled={images.length === 0 || loading}
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? "Analyzing..." : "Analyze My Outfit"}
            </Button>
          </div>
        </div>

        {/* Structured Analysis Output */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {!analysis.is_human ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-6 flex gap-4 items-start">
                  <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-display text-lg font-semibold mb-1">No human detected</h3>
                    <p className="text-sm text-muted-foreground">
                      We detected: <span className="font-medium text-foreground">{analysis.detected_object || "non-human subject"}</span>.
                      Please upload a photo with a person wearing the outfit.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-accent/10 overflow-hidden">
                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Detection summary */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-xl font-bold">Detection Summary</h2>
                      {analysis.rating ? (
                        <div className="flex items-center gap-1 text-accent font-bold">
                          <Star className="h-5 w-5 fill-accent" /> {analysis.rating}/10
                        </div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {analysis.skin_tone && (
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Skin Tone</div>
                          <div className="font-medium">{analysis.skin_tone}</div>
                        </div>
                      )}
                      {analysis.body_type && (
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Body Type</div>
                          <div className="font-medium">{analysis.body_type}</div>
                        </div>
                      )}
                      {analysis.gender_presentation && analysis.gender_presentation !== "unknown" && (
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gender</div>
                          <div className="font-medium capitalize">{analysis.gender_presentation}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outfit pieces */}
                  {analysis.outfit && (
                    <div>
                      <h3 className="font-display text-lg font-semibold mb-3">Outfit Breakdown</h3>
                      <div className="space-y-2 text-sm">
                        {analysis.outfit.upper_wear && <div><span className="text-muted-foreground">👕 Top:</span> {analysis.outfit.upper_wear}</div>}
                        {analysis.outfit.bottom_wear && <div><span className="text-muted-foreground">👖 Bottom:</span> {analysis.outfit.bottom_wear}</div>}
                        {analysis.outfit.outerwear && <div><span className="text-muted-foreground">🧥 Outerwear:</span> {analysis.outfit.outerwear}</div>}
                        {analysis.outfit.footwear && <div><span className="text-muted-foreground">👟 Footwear:</span> {analysis.outfit.footwear}</div>}
                        {analysis.outfit.accessories && analysis.outfit.accessories.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {analysis.outfit.accessories.map((a, i) => <Badge key={i} variant="secondary">{a}</Badge>)}
                          </div>
                        )}
                        {analysis.outfit.dominant_colors && analysis.outfit.dominant_colors.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            <span className="text-muted-foreground text-xs">Colors:</span>
                            {analysis.outfit.dominant_colors.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verdict */}
                  {analysis.verdict && (
                    <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
                      <p className="text-sm italic">"{analysis.verdict}"</p>
                    </div>
                  )}

                  {/* Lists */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {analysis.what_works && analysis.what_works.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-emerald-600 dark:text-emerald-400">✓ What Works</h4>
                        <ul className="space-y-1.5 text-sm">
                          {analysis.what_works.map((w, i) => <li key={i} className="flex gap-2"><span>•</span><span>{w}</span></li>)}
                        </ul>
                      </div>
                    )}
                    {analysis.improvements && analysis.improvements.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-amber-600 dark:text-amber-400">↗ Improvements</h4>
                        <ul className="space-y-1.5 text-sm">
                          {analysis.improvements.map((w, i) => <li key={i} className="flex gap-2"><span>•</span><span>{w}</span></li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {analysis.styling_tips && analysis.styling_tips.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">💡 Styling Tips</h4>
                      <ul className="space-y-1.5 text-sm">
                        {analysis.styling_tips.map((w, i) => <li key={i} className="flex gap-2"><span>•</span><span>{w}</span></li>)}
                      </ul>
                    </div>
                  )}

                  {analysis.alternative_pieces && analysis.alternative_pieces.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">🔄 Alternatives</h4>
                      <ul className="space-y-1.5 text-sm">
                        {analysis.alternative_pieces.map((w, i) => <li key={i} className="flex gap-2"><span>•</span><span>{w}</span></li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Inline Outfit Generator */}
        {analysis?.is_human && (
          <motion.div ref={generatorRef} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="mt-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3">
                <Wand2 className="h-4 w-4" /> Next Step
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Generate a Tailored Outfit</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Using your analysis as context — pick preferences and we'll craft a fresh look.
              </p>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <Button variant={gender === "female" ? "default" : "outline"} onClick={() => setGender("female")} className="rounded-full px-6">👩 Female</Button>
              <Button variant={gender === "male" ? "default" : "outline"} onClick={() => setGender("male")} className="rounded-full px-6">👨 Male</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Occasion</label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                  <SelectContent>{occasions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                  <SelectContent>{seasons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Palette</label>
                <Select value={palette} onValueChange={setPalette}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{palettes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Vibe</label>
                <Select value={vibe} onValueChange={setVibe}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{vibes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Specifications textbox */}
            <div className="mb-8">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Add Specifications <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Textarea
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder="e.g. include a scarf, no heels, summer wedding in Goa, must work with sneakers..."
                className="min-h-[80px] rounded-xl"
              />
            </div>

            <div className="flex justify-center gap-3 mb-10">
              <Button onClick={generateOutfit} disabled={!gender || !occasion || !season || !!isGenerating}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {isGenerating ? "Generating..." : "Generate Outfit Image"}
              </Button>
              {generated && (
                <Button variant="outline" onClick={generateOutfit} className="rounded-full" disabled={!!isGenerating}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                </Button>
              )}
            </div>

            {/* Background generation status */}
            {isGenerating && (
              <Card className="border-accent/20 bg-accent/5">
                <CardContent className="p-6 flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <div>
                    <p className="font-medium">Crafting your outfit in the background...</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {job?.status} • You can switch tabs or refresh — generation continues. Auto-saves to Wardrobe & Lookbook when ready.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {generated && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden border-accent/10">
                  {generated.output_image_url && (
                    <div className="aspect-video bg-secondary">
                      <img src={generated.output_image_url} alt="AI generated outfit" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                      <ReactMarkdown>{generated.output_text || ""}</ReactMarkdown>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>✓ Saved to <Link to="/lookbook" className="text-accent underline">Lookbook</Link></span>
                      <span>✓ Saved to <Link to="/wardrobe" className="text-accent underline">Wardrobe</Link></span>
                    </div>
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
