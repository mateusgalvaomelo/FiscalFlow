import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "./api";
import type { Notify } from "./App";
import { Modal } from "./components";
import type { Issue } from "./types";

const justificationSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(15, "Escreva pelo menos 15 caracteres.")
    .max(5000, "Máximo de 5.000 caracteres."),
});
export function JustifyModal({
  issue,
  notify,
  onClose,
}: {
  issue: Issue;
  notify: Notify;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const form = useForm<z.infer<typeof justificationSchema>>({
    resolver: zodResolver(justificationSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      await api("/justificativas", {
        method: "POST",
        body: JSON.stringify({ pendencia_id: issue.id, ...values }),
      });
      await client.invalidateQueries();
      notify("Justificativa enviada para revisão.");
      onClose();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  });
  return (
    <Modal title={`Justificar pendência #${issue.id}`} onClose={onClose}>
      <p className="muted">{issue.descricao}</p>
      <form onSubmit={submit}>
        <label>
          Justificativa
          <textarea
            rows={6}
            placeholder="Descreva a análise realizada e as evidências da regularização…"
            {...form.register("texto")}
          />
        </label>
        {form.formState.errors.texto && (
          <p className="field-error">{form.formState.errors.texto.message}</p>
        )}
        <p className="form-hint">
          O envio encaminha a pendência para revisão. A aprovação depende dos
          critérios da categoria.
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button" disabled={saving}>
            <Send size={15} />
            {saving ? "Enviando…" : "Enviar para revisão"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
