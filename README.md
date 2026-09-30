# Transmassa Panel API NestJS

Backend novo para substituir o coletor `8090` e concentrar o painel em uma API NestJS.

## Ideia

- O frontend fala só com esta API.
- A API lê os dados operacionais direto do banco existente.
- A API grava dados próprios do painel no PostgreSQL: usuários, filiais, mapeamento, filtros e auditoria.
- O coletor antigo deixa de ser necessário.

## Filiais fixas

As filiais abaixo são seedadas pela migration e ficam imutáveis por regra de backend:

- `RJ` - Rio de Janeiro
- `RB` - Ribeirão Preto
- `SP` - São Paulo

O endpoint especial para adicionar filial futura é:

```http
PUT /api/branches/admin
Authorization: Bearer <token admin>
```

Ele rejeita alteração de `RJ`, `RB` e `SP`. Somente usuário `ADMIN` acessa.

## Usuários locais

Todos os usuários são locais da Transmassa:

```text
admin@transmassa.local
transmassapainel@transmassa.local
```

O login aceita `admin` ou `admin@transmassa.local`.

Senha não fica criptografada reversível. Ela fica com hash `bcrypt`. O JWT serve para autenticar a sessão.

Troca de senha:

```http
POST /api/admin/users/:id/password
Authorization: Bearer <token admin>
```

Usuário comum não altera senha.

## Endpoints principais

```text
GET  /health

POST /api/auth/login
GET  /api/auth/me

GET  /api/admin/users
POST /api/admin/users
PATCH /api/admin/users/:id
POST /api/admin/users/:id/password

GET  /api/branches
PUT  /api/branches/admin

GET    /api/fleet-mapping/groups
GET    /api/fleet-mapping/base-codes
GET    /api/fleet-mapping/groups/:id/members
PUT    /api/fleet-mapping/groups/:id/members/:plate
DELETE /api/fleet-mapping/groups/:id/members/:plate
GET    /api/fleet-mapping/audit

GET /api/tv/overview
GET /api/tv/fleet-catalog
```

## Rodar local

```bash
cp .env.example .env
npm install
npm run migration:run
npm run start:dev
```

## Deploy sugerido

No servidor, antes de matar o coletor:

```bash
cd /home/ubuntu/transmassa-nest-backend
npm install
npm run migration:run
npm run build
PORT=8080 pm2 start dist/main.js --name transmassa-panel-api
curl -s http://127.0.0.1:8080/health
```

Quando o `/health`, login e `/api/tv/overview` estiverem OK:

```bash
cd /home/ubuntu/transmassa-fleet-collector
sudo docker compose stop api
```

Não remova o banco antigo antes de migrar os dados de mapeamento que já foram preenchidos.

## Migração do mapeamento antigo

Se o mapeamento atual estiver no Postgres do coletor, copie os dados para:

```text
panel_fleet_group_members
panel_audit_logs
```

Campos equivalentes:

| Antigo | Novo |
| --- | --- |
| `fleet_group_members.group_id` | `panel_fleet_group_members.group_id` |
| `plate` | `plate` |
| `base_code` | `branch_code` |
| `driver_name` | `driver_name` |
| `vehicle_type` | `vehicle_type` |
| `owner_code` | `owner_code` |
| `service_override` | `service_override` |
| `notes` | `notes` |
| `fleet_mapping_audit` | `panel_audit_logs` |

O grupo padrão seedado é `grupo-consolidado-alexandre`.
