import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { api, date } from "../api";
import type { Notify } from "../App";
import { Badge, Empty, ErrorState, Heading, Loading } from "../components";
import type { ImportRecord } from "../types";

export function ImportsPage({ notify }: { notify: Notify }) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ImportRecord | null>(null);
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["importacoes"],
    queryFn: () => api<ImportRecord[]>("/importacoes"),
  });
  const submit = async () => {
    if (!file) return;
    setSaving(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const output = await api<ImportRecord>("/importacoes", {
        method: "POST",
        body: form,
      });
      setResult(output);
      await client.invalidateQueries();
      notify("Importação processada. Confira os resultados abaixo.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="ENGENHARIA DE DADOS"
        title="Da planilha ao fluxo."
        description="Importe documentos com validação, consistência e rastreabilidade."
        action={
          <a className="button secondary" href="/api/modelo-importacao">
            <ArrowDownToLine size={16} />
            Baixar modelo
          </a>
        }
      />
      <div className="detail-grid">
        <section className="panel upload-panel">
          <div className="upload-area">
            <UploadCloud size={38} />
            <h2>{file ? file.name : "Selecione sua planilha"}</h2>
            <p>CSV ou XLSX · Até 10 MB · Máximo de 10.000 linhas</p>
            <label className="button secondary file-label">
              Escolher arquivo
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <button
            className="button"
            onClick={submit}
            disabled={!file || saving}
          >
            {saving ? "Processando registros…" : "Processar importação"}
            <ArrowRight size={16} />
          </button>
        </section>
        <section className="panel import-explain">
          <span className="eyebrow">QUALIDADE EM CADA ETAPA</span>
          <h2>
            Uma entrada.
            <br />
            Doze verificações.
          </h2>
          <p>
            Schema, tipos, datas, referências e duplicidades são conferidos
            antes de persistir cada registro.
          </p>
          <ol>
            <li>Baixe o modelo e preencha seus documentos fictícios.</li>
            <li>Use IDs existentes de projeto, fornecedor e responsável.</li>
            <li>
              Consulte as rejeições e corrija somente as linhas necessárias.
            </li>
          </ol>
          <a href="/api/dataset">
            <FileSpreadsheet size={16} />
            Baixar dataset completo
          </a>
        </section>
      </div>
      {result && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Resultado do processamento #{result.id}</h2>
            <Badge value={result.status} />
          </div>
          <div className="import-stats">
            <div>
              <strong>{result.registros_lidos}</strong>
              <span>Linhas lidas</span>
            </div>
            <div>
              <strong>{result.registros_validos}</strong>
              <span>Aceitas</span>
            </div>
            <div>
              <strong>{result.registros_rejeitados}</strong>
              <span>Rejeitadas</span>
            </div>
            <div>
              <strong>{result.tempo_execucao}s</strong>
              <span>Tempo de execução</span>
            </div>
          </div>
          {result.rejeicoes.length > 0 && (
            <div className="rejections">
              <a
                className="button secondary"
                href={`/api/importacoes/${result.id}/rejeicoes`}
              >
                <ArrowDownToLine size={15} />
                Baixar rejeições CSV
              </a>
              {result.rejeicoes.slice(0, 10).map((r) => (
                <p key={r.linha}>
                  <b>Linha {r.linha}</b> · {r.motivo}
                </p>
              ))}
              {result.rejeicoes.length > 10 && (
                <small>
                  Mostrando as primeiras 10 rejeições. Baixe o relatório
                  completo.
                </small>
              )}
            </div>
          )}
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Histórico de importações</h2>
        </div>
        {history.isLoading ? (
          <Loading />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : history.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Arquivo",
                    "Data",
                    "Lidas",
                    "Aceitas",
                    "Rejeitadas",
                    "Tempo",
                    "Status",
                    "Relatório",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nome_arquivo}</td>
                    <td>{date(r.data_importacao)}</td>
                    <td>{r.registros_lidos}</td>
                    <td>{r.registros_validos}</td>
                    <td>{r.registros_rejeitados}</td>
                    <td>{r.tempo_execucao}s</td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                    <td>
                      <a href={`/api/importacoes/${r.id}/rejeicoes`}>
                        Baixar CSV
                      </a>
                      <button
                        className="text-button"
                        onClick={() => setResult(r)}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
