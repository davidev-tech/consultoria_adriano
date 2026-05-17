import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, Loader2, MapPin } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInteracao, useEmpresas } from "@/lib/api/hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/interacoes")({
  head: () => ({ meta: [{ title: "Registrar Interação — Gestão do Cuidado" }] }),
  component: InteracoesPage,
});

function InteracoesPage() {
  const empresas = useEmpresas();
  const create = useCreateInteracao();

  const [idCliente, setIdCliente] = useState("");
  const [tipo, setTipo] = useState("Visita");
  const [dataHora, setDataHora] = useState(() => new Date().toISOString().slice(0, 16));
  const [coords, setCoords] = useState("");
  const [feedback, setFeedback] = useState("");

  const captureGeo = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords(`${pos.coords.latitude},${pos.coords.longitude}`),
      () => toast.error("Permissão de localização negada"),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente) {
      toast.error("Selecione uma empresa");
      return;
    }
    await create.mutateAsync({
      id_cliente: idCliente,
      tipo_interacao: tipo,
      data_hora: new Date(dataHora).toISOString(),
      coordenadas_geo: coords || null,
      feedback_anotacoes: feedback || null,
    });
    toast.success("Interação registrada");
    setFeedback("");
    setCoords("");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
            // consultor em campo
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Registrar Interação</h1>
          <p className="text-sm text-muted-foreground">
            Registre visitas, reuniões e feedbacks com cliente.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6 shadow-card"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Nova interação</p>
              <p className="text-xs text-muted-foreground">POST /interacoes</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Empresa cliente *</Label>
              <Select value={idCliente} onValueChange={setIdCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.data?.map((e) => (
                    <SelectItem key={e.id_cliente} value={e.id_cliente}>
                      {e.nome_empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visita">Visita</SelectItem>
                  <SelectItem value="Reunião">Reunião</SelectItem>
                  <SelectItem value="Ligação">Ligação</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data e hora</Label>
              <Input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Feedback / Anotações</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                placeholder="Notas da visita, próximos passos, percepções..."
              />
            </div>
          </div>

          {create.error && (
            <p className="text-xs text-destructive">{(create.error as Error).message}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Registrar
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
