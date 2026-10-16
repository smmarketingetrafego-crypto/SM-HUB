/**
 * Serviço de Busca e Normalização de CEP para o SM Hub
 * Suporta busca automática via ViaCEP com fallback para BrasilAPI
 * e permite override / preenchimento manual completo.
 */

export interface AddressData {
  zip: string;
  address: string;
  addressNumber?: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  source?: "viacep" | "brasilapi" | "manual";
}

export interface CepLookupResult {
  success: boolean;
  data?: AddressData;
  error?: string;
}

/**
 * Remove qualquer caractere que não seja número
 */
export function cleanCep(cep: string): string {
  return (cep || "").replace(/\D/g, "");
}

/**
 * Formata um CEP no padrão brasileiro: 00000-000
 */
export function formatCep(raw: string): string {
  const digits = cleanCep(raw).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Busca dados de endereço pelo CEP.
 * 1º tenta ViaCEP
 * 2º tenta BrasilAPI caso o primeiro falhe
 */
export async function lookupAddressByCep(rawCep: string): Promise<CepLookupResult> {
  const digits = cleanCep(rawCep);

  if (digits.length !== 8) {
    return {
      success: false,
      error: "O CEP deve conter exatamente 8 números.",
    };
  }

  // 1. Tentar ViaCEP (padrão dos Correios)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          success: true,
          data: {
            zip: formatCep(digits),
            address: data.logradouro || "",
            district: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
            complement: data.complemento || "",
            source: "viacep",
          },
        };
      }
    }
  } catch (err) {
    // ViaCEP falhou ou deu timeout, tentar fallback BrasilAPI
    console.warn("ViaCEP falhou ou timeout, tentando BrasilAPI...", err);
  }

  // 2. Fallback BrasilAPI
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && !data.errors) {
        return {
          success: true,
          data: {
            zip: formatCep(digits),
            address: data.street || "",
            district: data.neighborhood || "",
            city: data.city || "",
            state: data.state || "",
            complement: "",
            source: "brasilapi",
          },
        };
      }
    }
  } catch (err) {
    console.warn("BrasilAPI também falhou:", err);
  }

  return {
    success: false,
    error: "CEP não encontrado nas bases oficiais. Você pode preencher os campos de endereço manualmente.",
  };
}
