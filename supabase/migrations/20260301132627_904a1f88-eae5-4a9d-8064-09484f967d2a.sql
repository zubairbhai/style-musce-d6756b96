
-- Create storage bucket for outfit images
INSERT INTO storage.buckets (id, name, public) VALUES ('outfit-uploads', 'outfit-uploads', true);

-- Allow anyone to upload images (no auth required for this app)
CREATE POLICY "Anyone can upload outfit images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'outfit-uploads');

-- Allow anyone to view uploaded images
CREATE POLICY "Anyone can view outfit images"
ON storage.objects FOR SELECT
USING (bucket_id = 'outfit-uploads');

-- Allow anyone to delete their uploads
CREATE POLICY "Anyone can delete outfit images"
ON storage.objects FOR DELETE
USING (bucket_id = 'outfit-uploads');
