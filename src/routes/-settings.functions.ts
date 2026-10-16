import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fallback preferences se não houver no banco
const defaultPreferences = {
  theme: 'dark',
  accentColor: 'brand',
  sidebarCollapsed: false,
};

export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // O mock middleware retorna dummySupabase. Simulamos o retorno.
    return {
      brand: { name: "SM Hub", logoUrl: "/smhub-logo.png" },
      preferences: defaultPreferences,
      notifications: { email: true, whatsapp: false }
    };
  });

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    // const { key, value } = data as any;
    // await supabase.from('app_settings').upsert({ key, value });
    return { success: true };
  });
