# Patch XLSX - Transmassa Nest Backend

Este patch restaura as rotas que o frontend `transmassapainel` já chama:

- `GET /api/fleet-mapping/groups/:id/excel-export`
- `GET /api/fleet-mapping/groups/:id/excel-template`
- `POST /api/fleet-mapping/groups/:id/excel-import`

## O que o patch faz

- Exporta a frota atual do grupo em `.xlsx`.
- Gera um modelo `.xlsx` com abas `Frota` e `Referências`.
- Importa `.xlsx` fazendo UPSERT por placa.
- Não exclui placas que estiverem ausentes no arquivo.
- Retorna `{ total, created, updated }`, como o frontend espera.
- Valida placa, filial, vínculo e duplicidade antes de gravar.
- Mantém os registros de auditoria em `panel_audit_logs`.
- Faz o UPSERT em lote para evitar centenas/milhares de round-trips ao PostgreSQL.
- Limite: 10 MB por arquivo e 5.000 linhas por importação.

## Arquivos alterados

- `package.json` — adiciona `exceljs`.
- `src/fleet-mapping/fleet-mapping.controller.ts`
- `src/fleet-mapping/fleet-mapping.service.ts`

## Como aplicar com Git

Na raiz do repositório do backend:

```bash
git status
# deixe o working tree limpo antes de aplicar

git apply --check /caminho/transmassa-nest-xlsx.patch
git apply /caminho/transmassa-nest-xlsx.patch

npm install
npm run typecheck
npm run build
```

`npm install` é importante porque instala `exceljs` e atualiza o `package-lock.json`.
Se o seu deploy usa `npm ci`, faça commit também do `package-lock.json` atualizado.

## Reiniciar no servidor

O README atual do projeto usa o processo PM2 `transmassa-panel-api` na porta 8080.
Se ele já existe:

```bash
pm2 restart transmassa-panel-api --update-env
curl -s http://127.0.0.1:8080/health
```

Se ainda não existe:

```bash
PORT=8080 pm2 start dist/main.js --name transmassa-panel-api
curl -s http://127.0.0.1:8080/health
```

## Teste das rotas

Com um token JWT válido e um grupo existente:

```bash
export TOKEN='SEU_TOKEN'
export GROUP_ID='1'

curl -f \
  -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8080/api/fleet-mapping/groups/$GROUP_ID/excel-template" \
  -o /tmp/modelo.xlsx

curl -f \
  -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8080/api/fleet-mapping/groups/$GROUP_ID/excel-export" \
  -o /tmp/frota.xlsx

curl -f -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/frota.xlsx" \
  "http://127.0.0.1:8080/api/fleet-mapping/groups/$GROUP_ID/excel-import"
```

Resposta esperada no import:

```json
{
  "total": 10,
  "created": 2,
  "updated": 8
}
```

## Colunas da aba Frota

O modelo usa estas colunas:

`PLACA`, `FILIAL`, `TIPO_CORRIGIDO`, `VINCULO`, `TERCEIRO_CODIGO`, `MOTORISTA`, `SERVICO_OVERRIDE`, `OBSERVACOES`.

`VINCULO` aceita `PROPRIO` ou `TERCEIRO`. Quando for `TERCEIRO`, `TERCEIRO_CODIGO` é obrigatório.
