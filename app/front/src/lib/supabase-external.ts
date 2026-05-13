// Cliente Supabase externo (banco de dados do projeto "Gestão do Cuidado").
// NÃO confundir com o cliente auto-gerado em src/integrations/supabase/client.ts
// (esse aponta para o Lovable Cloud interno e não deve ser editado).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://erubhkiwdkotwmgqezca.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L6fWUE9UPCHzkquBb_bojQ_wKGHeJx0";

export const supabaseExternal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
