import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Palette, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";


const features = [
  {
    icon: Sparkles,
    title: "AI Outfit Suggestions",
    description: "Get personalized outfit ideas powered by AI, tailored to your style and occasion.",
  },
  {
    icon: Palette,
    title: "Style Quiz",
    description: "Discover your unique style profile through our interactive fashion quiz.",
  },
  {
    icon: MessageCircle,
    title: "AI Stylist Chat",
    description: "Chat with your personal AI stylist for real-time fashion advice and inspiration.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/30" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            className="max-w-2xl"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-accent font-medium tracking-widest uppercase text-sm mb-4"
            >
              AI-Powered Fashion
            </motion.p>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6"
            >
              Your AI Stylist,{" "}
              <span className="italic text-accent">Always Ready</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-muted-foreground max-w-lg mb-8"
            >
              Discover your perfect style with personalized outfit recommendations,
              trend insights, and an AI fashion advisor that understands you.
            </motion.p>
            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-wrap gap-4"
            >
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
                <Link to="/quiz">
                  Take the Style Quiz <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <Link to="/chat">Chat with AI Stylist</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Your Personal Fashion AI
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Everything you need to elevate your wardrobe and discover styles that speak to who you are.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="bg-card rounded-2xl p-8 border border-border/50 hover:border-accent/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Discover Your Style?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Take our quick style quiz and let AI curate looks that are uniquely you.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-10">
              <Link to="/quiz">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;