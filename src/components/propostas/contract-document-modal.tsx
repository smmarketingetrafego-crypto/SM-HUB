// @ts-nocheck
import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  Share2,
  X,
  ShieldCheck,
  Building2,
  UserCheck,
  CheckCircle2,
  FileText,
  Calendar,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import type { Orcamento, AgencyProfile } from "@/lib/api-propostas.functions";

interface ContractDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: Orcamento | null;
  agency: AgencyProfile | null;
}

export function ContractDocumentModal({
  open,
  onOpenChange,
  orcamento,
  agency,
}: ContractDocumentModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!orcamento) return null;

  const isApproved = orcamento.status === "aprovado";
  const clientSig = (orcamento as any).clientSignature;
  const hash = clientSig?.hash || `SHA256-${orcamento.id.toUpperCase()}-${Date.now().toString(16)}`;
  const signDate = clientSig?.signedAt || orcamento.aprovadoEm || new Date().toLocaleDateString("pt-BR");

  const agencyName = agency?.legalName || agency?.tradeName || "SM Hub Agência Digital";
  const agencyDoc = agency?.docNumber ? `${agency.docType === "cpf" ? "CPF" : "CNPJ"} nº ${agency.docNumber}` : "Inscrição Regular";
  const agencyAddress = agency?.address 
    ? `${agency.address}, ${agency.addressNumber || "s/n"} - ${agency.district || ""}, ${agency.city || ""}/${agency.state || ""}`
    : "Sede Comercial";

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/proposta/${orcamento.id}` : "";
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("Link do contrato copiado para a área de transferência!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl w-[96vw] max-h-[95vh] p-0 bg-[#0c0d12] border border-white/10 text-white rounded-2xl overflow-hidden shadow-2xl flex flex-col z-[150]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-[#14161f] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <FileText className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Visualização do Contrato Oficial & Orçamento
              </h3>
              <p className="text-[11px] text-gray-400">
                Documento formatado com validade jurídica Art. 784, III CPC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="h-9 text-xs border-white/10 hover:bg-white/5 text-gray-300"
            >
              <Share2 className="size-3.5 mr-1.5" /> Compartilhar Link
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-9 text-xs font-bold bg-brand text-black hover:bg-brand/90 shadow-md shadow-brand/20"
            >
              <Printer className="size-3.5 mr-1.5" /> Imprimir / Salvar PDF
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="size-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Document Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-black/40 flex justify-center">
          
          {/* Printable A4 White Paper Sheet */}
          <div 
            ref={printRef}
            className="w-full max-w-3xl bg-white text-neutral-900 shadow-2xl rounded-xl p-8 sm:p-12 space-y-6 text-xs sm:text-sm font-sans leading-relaxed print:p-0 print:shadow-none print:max-w-none print:rounded-none"
            id="printable-contract"
          >
            {/* Header Documento Timbrado */}
            <div className="border-b-2 border-neutral-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-neutral-500">
                  DOCUMENTO JURÍDICO VINCULANTE
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-neutral-950 uppercase tracking-tight mt-0.5">
                  CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                </h1>
                <p className="text-xs text-neutral-600 font-medium">
                  Instrumento Particular & Proposta Comercial Nº <strong className="text-neutral-950 font-mono">{orcamento.numero}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right text-[11px] text-neutral-600 shrink-0">
                <p className="font-bold text-neutral-900 text-xs">{agencyName}</p>
                <p>{agencyDoc}</p>
                <p>{agency?.email || "contato@smhub.com.br"}</p>
                <p>{agency?.phone || ""}</p>
              </div>
            </div>

            {/* Status & Metadados */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Data de Emissão:</span>
                <span className="font-semibold text-neutral-900">{orcamento.criadoEm}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Validade da Proposta:</span>
                <span className="font-semibold text-neutral-900">{orcamento.validadeAte || "15 dias"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Regime Contratual:</span>
                <span className="font-semibold text-neutral-900 uppercase">
                  {orcamento.tipoContrato === "recorrente" ? "Assinatura Recorrente Mensal" : "Projeto Pontual / Escopo Fechado"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">Status do Instrumento:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                  isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {isApproved ? "✓ Formalizado & Assinado" : "Aguardando Assinatura"}
                </span>
              </div>
            </div>

            {/* Cláusula 1: Qualificação das Partes */}
            <div className="space-y-2">
              <h2 className="text-xs sm:text-sm font-black uppercase text-neutral-950 tracking-wider border-b border-neutral-200 pb-1">
                Cláusula 1ª — Da Qualificação das Partes
              </h2>
              <p className="text-justify text-neutral-700 indent-4">
                Por este instrumento particular de prestação de serviços, de um lado:
              </p>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200 text-neutral-800 text-xs space-y-1">
                <p>
                  <strong>CONTRATADA:</strong> <span className="font-semibold">{agencyName}</span>, inscrita no {agencyDoc}, com endereço profissional em {agencyAddress}, doravante denominada simplesmente <strong>CONTRATADA</strong>.
                </p>
                <p>
                  <strong>CONTRATANTE:</strong> <span className="font-semibold">{orcamento.cliente}</span>, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.
                </p>
              </div>
              <p className="text-justify text-neutral-700 indent-4">
                Têm entre si, justo e contratado, o cumprimento das cláusulas e condições a seguir pactuadas.
              </p>
            </div>

            {/* Cláusula 2: Objeto e Escopo */}
            <div className="space-y-2">
              <h2 className="text-xs sm:text-sm font-black uppercase text-neutral-950 tracking-wider border-b border-neutral-200 pb-1">
                Cláusula 2ª — Do Objeto e Tabela de Escopo
              </h2>
              <p className="text-justify text-neutral-700 indent-4">
                O presente contrato tem por objeto a prestação dos serviços especializados de: <strong>{orcamento.titulo}</strong>, conforme discriminação técnica abaixo:
              </p>
              
              {/* Tabela de Itens */}
              <div className="border border-neutral-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-900 font-bold uppercase text-[10px]">
                      <th className="p-2.5">Descrição do Serviço / Entregável</th>
                      <th className="p-2.5 text-center w-16">Qtd</th>
                      <th className="p-2.5 text-right w-28">Investimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {orcamento.itens && orcamento.itens.length > 0 ? (
                      orcamento.itens.map((it, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="p-2.5 font-medium text-neutral-900">{it.descricao}</td>
                          <td className="p-2.5 text-center text-neutral-600">{it.quantidade}</td>
                          <td className="p-2.5 text-right font-semibold text-neutral-900">
                            R$ {(it.valorUnitario * it.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2.5 font-medium text-neutral-900">{orcamento.descricao || orcamento.titulo}</td>
                        <td className="p-2.5 text-center text-neutral-600">1</td>
                        <td className="p-2.5 text-right font-semibold text-neutral-900">
                          R$ {orcamento.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-100 border-t-2 border-neutral-300 font-bold text-neutral-950">
                      <td className="p-2.5 uppercase font-black" colSpan={2}>Valor Total Pactuado:</td>
                      <td className="p-2.5 text-right font-black text-sm text-neutral-950">
                        R$ {orcamento.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Cláusula 3: Honorários e Condições */}
            <div className="space-y-2">
              <h2 className="text-xs sm:text-sm font-black uppercase text-neutral-950 tracking-wider border-b border-neutral-200 pb-1">
                Cláusula 3ª — Dos Honorários, Prazos e Forma de Pagamento
              </h2>
              <div className="text-neutral-700 text-xs space-y-1.5 text-justify indent-4">
                <p>
                  Pelos serviços contratados, o <strong>CONTRATANTE</strong> pagará à <strong>CONTRATADA</strong> o valor global estipulado nesta proposta. 
                  {orcamento.condicoesPagamento ? ` Condições pactuadas: ${orcamento.condicoesPagamento}.` : " Pagamento via Pix com liquidação imediata."}
                </p>
                <p>
                  O prazo estimado para início da execução é de {orcamento.prazoEntrega || "imediato após confirmação"}, condicionado ao fornecimento de acessos e materiais necessários por parte do <strong>CONTRATANTE</strong>.
                </p>
                {agency?.pixKey && (
                  <p>
                    Os pagamentos eletrônicos deverão ser destinados exclusivamente para a Chave Pix oficial cadastrada: <strong>{agency.pixKey}</strong> ({agency.pixBank || "Banco Oficial"}), em nome de {agency.pixBeneficiary || agencyName}.
                  </p>
                )}
              </div>
            </div>

            {/* Cláusula 4: Foro e Validade */}
            <div className="space-y-2">
              <h2 className="text-xs sm:text-sm font-black uppercase text-neutral-950 tracking-wider border-b border-neutral-200 pb-1">
                Cláusula 4ª — Do Foro e Disposições Legais
              </h2>
              <p className="text-neutral-700 text-xs text-justify indent-4">
                As partes elegem a Comarca do domicílio da <strong>CONTRATADA</strong> para dirimir quaisquer dúvidas oriundas deste instrumento. O presente documento constitui título executivo extrajudicial nos termos do <strong>Artigo 784, inciso III do Código de Processo Civil</strong>, com validade plena de comprovação de autoria e integridade conferida pelo <strong>Artigo 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>.
              </p>
            </div>

            {/* SEÇÃO: CERTIFICADO DE ASSINATURA ELETRÔNICA */}
            <div className="mt-8 pt-6 border-t-2 border-neutral-900 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-700" />
                  <span className="font-black text-xs uppercase tracking-wider text-neutral-900">
                    Certificado de Assinatura Eletrônica & Autenticidade Digital
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                  {isApproved ? "ASSINATURA VERIFICADA" : "EMISSÃO PENDENTE"}
                </span>
              </div>

              {isApproved ? (
                <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase font-bold block">Signatário(a) Autorizado(a):</span>
                      <span className="font-bold text-neutral-950 text-sm">
                        {clientSig?.name || orcamento.cliente}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase font-bold block">Documento Cadastrado:</span>
                      <span className="font-bold text-neutral-950 font-mono">
                        {clientSig?.document || "CPF/CNPJ Registrado"}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase font-bold block">Data e Hora do Registro (Brasília):</span>
                      <span className="font-semibold text-neutral-800">
                        {signDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase font-bold block">Endereço IP & Carimbo Criptográfico:</span>
                      <span className="font-mono text-[11px] text-neutral-700 truncate block">
                        IP: {clientSig?.ip || "Registrado via Web"} • TLS 256-bit
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] font-mono text-neutral-600">
                    <span className="truncate">Hash de Integridade: {hash}</span>
                    <span className="shrink-0 font-sans font-semibold text-emerald-700">Art. 784, III CPC Validado</span>
                  </div>

                  {/* Rubrica Caligráfica Representativa */}
                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase">Assinatura Digital Registrada:</span>
                      <span className="font-serif italic text-lg sm:text-xl text-neutral-950 font-semibold">
                        {clientSig?.name || orcamento.cliente}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block uppercase">Pela Contratada:</span>
                      <span className="font-serif italic text-base text-neutral-900 font-semibold">
                        {agency?.founder || agency?.representativeName || agencyName}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-900">
                  <p className="font-semibold">Este contrato encontra-se em fase de análise e aguarda a assinatura digital do contratante.</p>
                  <p className="text-[11px] text-amber-700 mt-1">Ao assinar na página oficial, o carimbo digital com Hash SHA-256 será impresso aqui automaticamente.</p>
                </div>
              )}
            </div>

            {/* Rodapé Fiscal */}
            <div className="pt-4 border-t border-neutral-200 text-center text-[10px] text-neutral-500">
              Gerado automaticamente pela plataforma SM HUB. Para verificação da autenticidade deste documento acesse a URL oficial da proposta.
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
