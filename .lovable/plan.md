# StyleSense – GenAI-Powered Fashion Recommendation System

A smart fashion advisor that helps users discover outfit ideas, get styling tips, and receive personalized recommendations using AI.

---

## Pages & Features

### 1. Landing Page

- Bold hero section with fashion imagery and tagline ("Your AI Stylist, Always Ready")
- Feature highlights: AI Outfit Suggestions, Style Quiz, Wardrobe Assistant
- Call-to-action to start the Style Quiz or jump into the AI Stylist chat

### 2. Style Quiz

- Multi-step interactive quiz (4-5 steps) asking about:
  - Preferred style (casual, formal, streetwear, bohemian, minimalist, etc.)
  - Favorite colors and patterns
  - Body type & fit preferences
  - Occasions they dress for most (work, date night, weekend, etc.)
- Results in a personalized "Style Profile" card summarizing their preferences
- Style profile is saved locally and used to personalize AI recommendations

### 3. AI Stylist Chat

- Full-featured chat interface with streaming AI responses
- Users describe an occasion, mood, or ask for outfit advice
- AI responds with detailed outfit suggestions including clothing items, colors, accessories, and styling tips
- AI generates outfit mood board images using image generation
- Markdown-rendered responses for rich formatting
- Chat history within the session

### 4. Outfit Generator

- Users select parameters: occasion, season, color palette, style vibe
- AI generates a complete outfit recommendation with:
  - Visual mood board image (AI-generated)
  - Item-by-item breakdown (top, bottom, shoes, accessories)
  - Styling tips and alternatives
- "Regenerate" button for new suggestions
- Save favorite outfits to a local collection

### 5. Saved Outfits / Lookbook

- Grid gallery of saved outfit recommendations
- Each card shows the AI-generated image and outfit summary
- Delete or re-visit saved looks

### 6. Trend Explorer

- AI-generated content about current fashion trends
- Categories: Seasonal, Street Style, Workwear, Evening
- Each trend card with AI-generated imagery and description
- searching google for fetching image with suggested outfit final

---

## Design & UX

- Elegant, fashion-forward design with clean typography  Warm neutral color palette with accent colors (blush pink, soft gold, charcoal)
- Smooth animations and transitions between sections
- Fully responsive — mobile-first approach
- Dark mode support

## Backend (Lovable Cloud)

- Edge function for AI chat (streaming) using Lovable AI
- Edge function for outfit generation (with image generation via Gemini)
- Edge function for trend content generation