-- Storage policies for the "materiais" bucket (bucket created manually via Dashboard: private,
-- 20 MB limit, MIME types restricted to PDF/imagem/docx/pptx). Every upload must save under
-- {user_id}/... — these policies key off (storage.foldername(name))[1] matching auth.uid(),
-- so any upload code that doesn't prefix the path with the owner's UUID leaves that file
-- inaccessible to its own owner.

CREATE POLICY "Usuários podem inserir seus próprios arquivos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materiais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem ler seus próprios arquivos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'materiais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem atualizar seus próprios arquivos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'materiais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar seus próprios arquivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'materiais' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
