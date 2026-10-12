import { expect, test } from "@playwright/test";

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/demo/restaurar", {
    data: { confirmacao: "RESTAURAR" },
    headers: { "X-Demo-User": "1" },
  });
  expect(response.ok()).toBeTruthy();
});

test("dashboard, revisão, cobrança, importação idempotente e tema", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tudo em fluxo. Tudo sob controle." }),
  ).toBeVisible();
  await expect(page.getByText("1.500", { exact: true }).first()).toBeVisible();
  const response = await request.get(
    "/api/pendencias?tipo=duplicidade&status=aberta&tamanho=100",
  );
  const { items } = await response.json();
  expect(items.length).toBeGreaterThan(0);
  const issue = items[0];
  await page.goto(`/documentos/${issue.documento_id}`);
  await page
    .locator(".issue-row")
    .filter({ hasText: `#${issue.id} · Duplicidade` })
    .getByRole("button", { name: "Justificar", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Justificativa", exact: true })
    .fill(
      "Documento fictício conferido para demonstração; segunda via administrativa reconhecida.",
    );
  await page
    .getByRole("button", { name: "Enviar para revisão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Justificativas", exact: true }).click();
  const card = page
    .locator("article")
    .filter({ hasText: "Documento fictício conferido para demonstração" })
    .first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Revisar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Comentário do revisor" })
    .fill("Documento sintético revisado e aprovado.");
  await page.getByRole("button", { name: "Confirmar revisão" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/cobrancas");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Gerar prévia (1)" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Registrar envio simulado" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/importacoes");
  await page.locator("input[type=file]").setInputFiles({
    name: "e2e.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "numero_documento,fornecedor_id,projeto_id,responsavel_id,data_emissao,data_recebimento,data_vencimento,valor,descricao\nE2E-" +
        Date.now() +
        ",1,1,11,2026-10-01,2026-10-02,2026-11-01,120.50,Documento sintético E2E\n",
    ),
  });
  await page.getByRole("button", { name: "Processar importação" }).click();
  await expect(
    page.getByRole("heading", { name: /Resultado do processamento/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(".import-stats > div")
      .filter({ hasText: "Aceitas" })
      .locator("strong"),
  ).toHaveText("1");
  await page.getByRole("button", { name: "Processar importação" }).click();
  await expect(
    page
      .locator(".import-stats > div")
      .filter({ hasText: "Rejeitadas" })
      .locator("strong"),
  ).toHaveText("1");
  await expect(page.locator(".rejections")).toContainText(
    "Registro já existente",
  );
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "dark");
});

test("telas, responsividade e captura real", async ({ page, request }) => {
  await request.post("/api/demo/restaurar", {
    data: { confirmacao: "RESTAURAR" },
    headers: { "X-Demo-User": "1" },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/documentos",
    "/pendencias",
    "/justificativas",
    "/cobrancas",
    "/importacoes",
    "/projetos",
    "/configuracoes",
    "/sobre",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".loading")).toHaveCount(0);
    await expect(page.locator(".error").first()).toHaveCount(0);
  }
  await page.goto("/");
  await expect(
    page.getByText("Volume financeiro", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".loading")).toHaveCount(0);
  await page.screenshot({
    path: "../docs/screenshots/dashboard.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("link", { name: "Recebimento fiscal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recebimento fiscal", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
