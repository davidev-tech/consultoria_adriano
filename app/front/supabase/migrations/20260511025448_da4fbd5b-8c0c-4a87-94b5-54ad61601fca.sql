
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  segment TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  consultor TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_occurred_at ON public.activities(occurred_at DESC);
CREATE INDEX idx_activities_client_id ON public.activities(client_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Auth insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Auth insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update activities" ON public.activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete activities" ON public.activities FOR DELETE TO authenticated USING (true);
