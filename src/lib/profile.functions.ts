import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MyProfile {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: string;
  preferences: Record<string, any>;
  // Extended profile fields used in configuracoes.tsx
  fullName?: string;
  phone?: string;
  jobTitle?: string;
  instagram?: string;
  website?: string;
  city?: string;
  bio?: string;
  avatarUrl?: string | null;
  company?: string;
  docId?: string;
  address?: string;
  addressNumber?: string;
  district?: string;
  state?: string;
  zip?: string;
  country?: string;
  currency?: string;
  language?: string;
  publicSlug?: string;
  revenueGoal?: number;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      id: "user-1",
      name: "",
      email: "",
      photoUrl: null,
      avatarUrl: null,
      role: "member",
      preferences: {},
      fullName: "",
      phone: "",
      jobTitle: "",
      instagram: "",
      website: "",
      city: "",
      bio: "",
      company: "",
      docId: "",
      address: "",
      addressNumber: "",
      district: "",
      state: "",
      zip: "",
      country: "BR",
      currency: "BRL",
      language: "pt-BR",
      publicSlug: "",
      revenueGoal: 0,
    } as MyProfile;
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { success: true };
  });

export const saveMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { success: true };
  });
