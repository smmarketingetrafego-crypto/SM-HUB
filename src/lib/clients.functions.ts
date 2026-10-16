import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ClientStatus = "ativo" | "onboarding" | "pausado" | "inadimplente";

export type ClientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactName: string;
  documentType: string;
  documentId: string;
  birthDate: string | null;
  zip: string;
  address: string;
  addressNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  segment: string;
  projectInterest: string;
  tags: string[];
  notes: string;
  withheldIss: boolean;
  issRate: number;
  pipelineId: string | null;
  pipelineStage: string | null;
  contractStart: string | null;
  contractMonths: number;
  monthlyValue: number;
  status: ClientStatus;
  photoUrl: string | null;
  archived: boolean;
  source: string;
  createdAt: string;
  groupIds: string[];
};

export type ClientGroup = {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
};

export type ClientInput = Omit<ClientRecord, "id" | "createdAt" | "archived" | "source"> & {
  id?: string;
};

export type RegistrationLink = {
  id: string;
  label: string;
  token: string;
  active: boolean;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// In-memory storage for demo mode
// ---------------------------------------------------------------------------
let _clients: ClientRecord[] = [];
let _groups: ClientGroup[] = [];
let _links: RegistrationLink[] = [];

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { clients: _clients, groups: _groups };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: ClientInput }) => {
    if (data.id) {
      const idx = _clients.findIndex((c) => c.id === data.id);
      if (idx !== -1) {
        _clients[idx] = { ..._clients[idx], ...data } as ClientRecord;
        return { client: _clients[idx] };
      }
    }
    const newClient: ClientRecord = {
      id: `c_${Date.now()}`,
      createdAt: new Date().toISOString(),
      archived: false,
      source: "manual",
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      contactName: data.contactName ?? "",
      documentType: data.documentType ?? "CPF",
      documentId: data.documentId ?? "",
      birthDate: data.birthDate ?? null,
      zip: data.zip ?? "",
      address: data.address ?? "",
      addressNumber: data.addressNumber ?? "",
      complement: data.complement ?? "",
      district: data.district ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      segment: data.segment ?? "",
      projectInterest: data.projectInterest ?? "",
      tags: data.tags ?? [],
      notes: data.notes ?? "",
      withheldIss: data.withheldIss ?? false,
      issRate: data.issRate ?? 0,
      pipelineId: data.pipelineId ?? null,
      pipelineStage: data.pipelineStage ?? null,
      contractStart: data.contractStart ?? null,
      contractMonths: data.contractMonths ?? 0,
      monthlyValue: data.monthlyValue ?? 0,
      status: data.status ?? "onboarding",
      photoUrl: data.photoUrl ?? null,
      groupIds: data.groupIds ?? [],
    };
    _clients.push(newClient);
    return { client: newClient };
  });

export const setClientArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { id: string; archived: boolean; name: string } }) => {
    const idx = _clients.findIndex((c) => c.id === data.id);
    if (idx !== -1) _clients[idx].archived = data.archived;
    return { success: true };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { id: string; name: string } }) => {
    _clients = _clients.filter((c) => c.id !== data.id);
    return { success: true };
  });

export const saveClientGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: Partial<ClientGroup> }) => {
    if (data.id) {
      const idx = _groups.findIndex((g) => g.id === data.id);
      if (idx !== -1) {
        _groups[idx] = { ..._groups[idx], ...data } as ClientGroup;
        return { group: _groups[idx] };
      }
    }
    const newGroup: ClientGroup = {
      id: `g_${Date.now()}`,
      name: data.name ?? "",
      description: data.description ?? "",
      color: data.color ?? "#C9A227",
      memberCount: 0,
    };
    _groups.push(newGroup);
    return { group: newGroup };
  });

export const deleteClientGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { id: string } }) => {
    _groups = _groups.filter((g) => g.id !== data.id);
    return { success: true };
  });

export const listRegistrationLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return _links;
  });

export const createRegistrationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { label: string } }) => {
    const newLink: RegistrationLink = {
      id: `l_${Date.now()}`,
      label: data.label ?? "Link principal",
      token: `tok_${Math.random().toString(36).slice(2)}`,
      active: true,
      createdAt: new Date().toISOString(),
    };
    _links.push(newLink);
    return newLink;
  });

export const setRegistrationLinkActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { id: string; active: boolean } }) => {
    const idx = _links.findIndex((l) => l.id === data.id);
    if (idx !== -1) _links[idx].active = data.active;
    return { success: true };
  });
