import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, MapPin, CheckCircle2, AlertCircle, Edit3, X } from "lucide-react";
import { formatCep, cleanCep, lookupAddressByCep, AddressData } from "@/lib/cep-lookup";
import { toast } from "sonner";

export interface AddressFormValues {
  zip: string;
  address: string;
  addressNumber: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

interface AddressFormFieldsProps {
  values: AddressFormValues;
  onChange: (patch: Partial<AddressFormValues>) => void;
  /** Label customizado para o cabeçalho (ex: 'Endereço da Agência', 'Endereço do Cliente') */
  title?: string;
  description?: string;
  /** Se deve mostrar o campo de complemento */
  showComplement?: boolean;
  /** Classes adicionais para o container */
  className?: string;
}

export function AddressFormFields({
  values,
  onChange,
  title,
  description,
  showComplement = true,
  className = "",
}: AddressFormFieldsProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const numberInputRef = useRef<HTMLInputElement | null>(null);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCep(raw);
    onChange({ zip: formatted });
    setSearchStatus("idle");

    // Se completou os 8 dígitos, faz a busca automática
    const digits = cleanCep(formatted);
    if (digits.length === 8) {
      triggerLookup(digits);
    }
  };

  const triggerLookup = async (cepDigits?: string) => {
    const digits = cepDigits || cleanCep(values.zip);
    if (digits.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setIsSearching(true);
    setSearchStatus("idle");
    setStatusMessage("Consultando bases de endereços...");

    const res = await lookupAddressByCep(digits);
    setIsSearching(false);

    if (res.success && res.data) {
      const data: AddressData = res.data;
      onChange({
        zip: data.zip,
        address: data.address || values.address,
        district: data.district || values.district,
        city: data.city || values.city,
        state: data.state || values.state,
        ...(data.complement && !values.complement ? { complement: data.complement } : {}),
      });

      setSearchStatus("success");
      setStatusMessage(`Endereço localizado via ${data.source === "brasilapi" ? "BrasilAPI" : "ViaCEP"}`);
      toast.success("Endereço preenchido automaticamente pelo CEP!");

      // Foca automaticamente no campo do número
      setTimeout(() => {
        numberInputRef.current?.focus();
      }, 100);
    } else {
      setSearchStatus("error");
      setStatusMessage(res.error || "CEP não localizado. Preencha manualmente.");
      toast.info("CEP não localizado na base. Você pode preencher todos os campos manualmente.");
    }
  };

  const clearAddress = () => {
    onChange({
      zip: "",
      address: "",
      addressNumber: "",
      complement: "",
      district: "",
      city: "",
      state: "",
    });
    setSearchStatus("idle");
    setStatusMessage("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="size-4 text-brand" /> {title}
            </h4>
            {description && (
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
          {(values.zip || values.address || values.city) && (
            <button
              type="button"
              onClick={clearAddress}
              className="text-[11px] text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <X className="size-3" /> Limpar endereço
            </button>
          )}
        </div>
      )}

      {/* CEP & Status Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
            CEP <span className="text-[11px] text-gray-500 font-normal">(Busca automática nos Correios)</span>
          </Label>

          {/* Status Badge */}
          {searchStatus === "success" && (
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-medium flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Preenchido via CEP
            </Badge>
          )}
          {searchStatus === "error" && (
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] font-medium flex items-center gap-1">
              <AlertCircle className="size-3" /> Modo manual ativo
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={values.zip}
              onChange={handleCepChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  triggerLookup();
                }
              }}
              placeholder="00000-000"
              maxLength={9}
              className="bg-black/40 border-white/10 h-10 rounded-xl text-sm font-mono tracking-wider focus:border-brand pr-10"
            />
            {isSearching ? (
              <Loader2 className="size-4 animate-spin text-brand absolute right-3 top-3 pointer-events-none" />
            ) : (
              <MapPin className="size-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isSearching}
            onClick={() => triggerLookup()}
            className="h-10 px-3.5 rounded-xl border-brand/30 bg-brand/5 hover:bg-brand/15 text-brand text-xs font-semibold shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Buscando...
              </>
            ) : (
              <>
                <Search className="size-3.5 mr-1.5" /> Buscar CEP
              </>
            )}
          </Button>
        </div>

        {statusMessage && (
          <p className={`text-[11px] ${searchStatus === "error" ? "text-amber-400" : searchStatus === "success" ? "text-emerald-400" : "text-gray-400"}`}>
            {statusMessage}
          </p>
        )}
      </div>

      {/* Manual Address Fields */}
      <div className="grid gap-3 sm:grid-cols-12">
        {/* Logradouro */}
        <div className="sm:col-span-8 space-y-1.5">
          <Label className="text-xs text-gray-300 font-semibold">
            Logradouro / Rua / Avenida
          </Label>
          <Input
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Ex: Av. Paulista ou Rua das Flores"
            className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
          />
        </div>

        {/* Número */}
        <div className="sm:col-span-4 space-y-1.5">
          <Label className="text-xs text-gray-300 font-semibold">
            Número *
          </Label>
          <Input
            ref={numberInputRef}
            value={values.addressNumber}
            onChange={(e) => onChange({ addressNumber: e.target.value })}
            placeholder="Ex: 1000 ou S/N"
            className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
          />
        </div>

        {/* Complemento */}
        {showComplement && (
          <div className="sm:col-span-6 space-y-1.5">
            <Label className="text-xs text-gray-300 font-semibold">
              Complemento <span className="text-[10px] text-gray-500 font-normal">(Opcional)</span>
            </Label>
            <Input
              value={values.complement || ""}
              onChange={(e) => onChange({ complement: e.target.value })}
              placeholder="Ex: Sala 42, Bloco B, Apto 101"
              className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
            />
          </div>
        )}

        {/* Bairro */}
        <div className={showComplement ? "sm:col-span-6 space-y-1.5" : "sm:col-span-4 space-y-1.5"}>
          <Label className="text-xs text-gray-300 font-semibold">
            Bairro
          </Label>
          <Input
            value={values.district}
            onChange={(e) => onChange({ district: e.target.value })}
            placeholder="Ex: Bela Vista ou Centro"
            className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
          />
        </div>

        {/* Cidade */}
        <div className="sm:col-span-8 space-y-1.5">
          <Label className="text-xs text-gray-300 font-semibold">
            Cidade
          </Label>
          <Input
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Ex: São Paulo ou Imperatriz"
            className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
          />
        </div>

        {/* Estado (UF) */}
        <div className="sm:col-span-4 space-y-1.5">
          <Label className="text-xs text-gray-300 font-semibold">
            Estado (UF)
          </Label>
          <Input
            value={values.state}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="Ex: SP"
            maxLength={2}
            className="bg-black/40 border-white/10 h-10 rounded-xl text-sm uppercase font-semibold focus:border-brand"
          />
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <Edit3 className="size-3 text-brand" /> Todos os campos acima podem ser editados manualmente a qualquer momento.
        </span>
      </div>
    </div>
  );
}
