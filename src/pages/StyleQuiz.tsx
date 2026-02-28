import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface QuizStep {
  title: string;
  subtitle: string;
  options: { label: string; emoji: string }[];
  multi?: boolean;
}

const steps: QuizStep[] = [
  {
    title: "What's your style vibe?",
    subtitle: "Pick the styles that resonate with you",
    options: [
      { label: "Casual", emoji: "👕" },
      { label: "Formal", emoji: "👔" },
      { label: "Streetwear", emoji: "🧢" },
      { label: "Bohemian", emoji: "🌸" },
      { label: "Minimalist", emoji: "⬜" },
      { label: "Vintage", emoji: "🎞️" },
    ],
    multi: true,
  },
  {
    title: "Favorite colors?",
    subtitle: "Choose colors you love wearing",
    options: [
      { label: "Neutrals", emoji: "🤎" },
      { label: "Pastels", emoji: "🩷" },
      { label: "Bold & Bright", emoji: "🔴" },
      { label: "Earth Tones", emoji: "🟤" },
      { label: "Monochrome", emoji: "⚫" },
      { label: "Jewel Tones", emoji: "💎" },
    ],
    multi: true,
  },
  {
    title: "What's your ideal fit?",
    subtitle: "How do you like your clothes to feel?",
    options: [
      { label: "Fitted", emoji: "📐" },
      { label: "Relaxed", emoji: "🛋️" },
      { label: "Oversized", emoji: "🧥" },
      { label: "Tailored", emoji: "✂️" },
    ],
  },
  {
    title: "Where do you dress up most?",
    subtitle: "Select the occasions you style for",
    options: [
      { label: "Work / Office", emoji: "💼" },
      { label: "Date Night", emoji: "🌹" },
      { label: "Weekend Casual", emoji: "☕" },
      { label: "Events & Parties", emoji: "🎉" },
      { label: "Travel", emoji: "✈️" },
      { label: "Everyday", emoji: "🏠" },
    ],
    multi: true,
  },
];

const StyleQuiz = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [completed, setCompleted] = useState(false);

  const step = steps[currentStep];

  const toggleOption = (label: string) => {
    const current = answers[currentStep] || [];
    if (step.multi) {
      setAnswers({
        ...answers,
        [currentStep]: current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label],
      });
    } else {
      setAnswers({ ...answers, [currentStep]: [label] });
    }
  };

  const canProceed = (answers[currentStep]?.length || 0) > 0;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save profile locally
      const profile = {
        styles: answers[0] || [],
        colors: answers[1] || [],
        fit: answers[2] || [],
        occasions: answers[3] || [],
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("stylesense-profile", JSON.stringify(profile));
      setCompleted(true);
    }
  };

  if (completed) {
    const profile = JSON.parse(localStorage.getItem("stylesense-profile") || "{}");
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <Card className="border-accent/20 overflow-hidden">
            <div className="bg-gradient-to-br from-accent/20 via-gold/10 to-transparent p-8 text-center">
              <Sparkles className="h-10 w-10 text-accent mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold mb-2">Your Style Profile</h2>
              <p className="text-sm text-muted-foreground">Here's what makes your style unique</p>
            </div>
            <CardContent className="p-6 space-y-4">
              {[
                { label: "Style Vibes", values: profile.styles },
                { label: "Color Palette", values: profile.colors },
                { label: "Preferred Fit", values: profile.fit },
                { label: "Top Occasions", values: profile.occasions },
              ].map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {section.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.values?.map((v: string) => (
                      <span
                        key={v}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-4 flex gap-3">
                <Button asChild className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
                  <Link to="/chat">Chat with AI Stylist</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 rounded-full">
                  <Link to="/generator">Generate Outfits</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
      <div className="max-w-lg w-full mx-4">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-display text-3xl font-bold mb-2">{step.title}</h2>
            <p className="text-muted-foreground mb-8">{step.subtitle}</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {step.options.map((option) => {
                const selected = answers[currentStep]?.includes(option.label);
                return (
                  <button
                    key={option.label}
                    onClick={() => toggleOption(option.label)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/30"
                    }`}
                  >
                    {selected && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-accent" />
                    )}
                    <span className="text-2xl block mb-1">{option.emoji}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-6"
          >
            {currentStep === steps.length - 1 ? "See My Profile" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StyleQuiz;
