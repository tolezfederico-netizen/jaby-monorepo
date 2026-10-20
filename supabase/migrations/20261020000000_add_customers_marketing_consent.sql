-- Consentimiento opcional del cliente para recibir novedades y promociones (Ley 25.326).
-- Solo se marca en true cuando el cliente lo acepta explícitamente en el checkout.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
