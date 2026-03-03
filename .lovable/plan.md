

## Plan: Add Gender Selection + OpenRouter for Text Generation

### Overview
Add a male/female gender toggle to the Outfit Generator UI and switch the text generation backend from Lovable AI to OpenRouter's free `arcee-ai/trinity-large-preview:free` model. Image generation stays on Lovable AI.

### Changes

#### 1. Store the OpenRouter API key as a secret
- Use the `add_secret` tool to store `OPENROUTER_API_KEY` with the provided key so the edge function can access it securely.

#### 2. Update the Edge Function (`supabase/functions/generate-outfit/index.ts`)
- Accept a new `gender` parameter from the request body.
- Inject gender into the prompt (e.g., "Generate a complete **men's/women's** outfit recommendation...").
- Replace the Lovable AI text generation call with an OpenRouter call:
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Model: `arcee-ai/trinity-large-preview:free`
  - Auth: `Bearer ${OPENROUTER_API_KEY}`
- Keep the image generation section unchanged (Lovable AI with `google/gemini-2.5-flash-image`).

#### 3. Update the Frontend (`src/pages/OutfitGenerator.tsx`)
- Add a gender state (`"male" | "female"`) defaulting to empty.
- Add a gender selector row above or alongside the existing selectors -- two toggle-style buttons or a Select dropdown for "Male" / "Female".
- Pass `gender` in the request body to the edge function.
- Make gender required alongside occasion and season for the Generate button to be enabled.

#### 4. Update `supabase/config.toml`
- Add `[functions.fetch-fashion-articles]` entry if missing (noticed it's not listed but the function exists).

### Technical Details
- OpenRouter API is OpenAI-compatible, so the fetch call structure is nearly identical -- just swap the URL, auth header, and model name.
- The free tier model has no cost but may have rate limits; existing error handling for 429 will cover this.
- Gender-aware prompt will adjust clothing items (e.g., suits vs dresses, men's vs women's accessories).

