-- =====================================================================
-- EcoVerify · 3/5 · Armazenamento das fotos (Supabase Storage)
--
-- Cria o bucket PRIVADO "uploads", onde ficam as fotos das comprovações, dos
-- pontos de lixo e as mídias do chat. Privado = nenhum link público: o servidor
-- do app lê e grava com a SUPABASE_SERVICE_ROLE_KEY e só mostra cada foto para
-- quem pode vê-la (a pessoa, a moderação e o admin).
--
-- Se você mudar o nome aqui, use o mesmo em SUPABASE_STORAGE_BUCKET na Vercel.
-- Também dá para criar pela tela: Storage → New bucket → "uploads", Public desligado.
-- Pode rodar de novo sem problema.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 52428800) -- 50 MB por arquivo (fotos têm limite de 10 MB no app)
on conflict (id) do update set public = false;

-- Sem policies de propósito: só a service role (servidor do app) acessa o bucket.

-- Conferência: deve mostrar uploads com public = false.
select id, name, public, file_size_limit from storage.buckets where id = 'uploads';
