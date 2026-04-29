
CREATE TABLE public.generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'outfit',
  status TEXT NOT NULL DEFAULT 'pending',
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_text TEXT,
  output_image_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own jobs" ON public.generation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own jobs" ON public.generation_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own jobs" ON public.generation_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own jobs" ON public.generation_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_generation_jobs_user_status ON public.generation_jobs(user_id, status, created_at DESC);

CREATE TRIGGER update_generation_jobs_updated_at
BEFORE UPDATE ON public.generation_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime so client can listen for job completion
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
