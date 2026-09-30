BEGIN;

CREATE TABLE IF NOT EXISTS panel_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PANEL')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS panel_branches (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS panel_fleet_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_by BIGINT NULL REFERENCES panel_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS panel_fleet_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES panel_fleet_groups(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  branch_code TEXT NULL REFERENCES panel_branches(code),
  driver_name TEXT NULL,
  vehicle_type TEXT NULL,
  owner_code TEXT NULL,
  service_override TEXT NULL,
  notes TEXT NULL,
  created_by BIGINT NULL REFERENCES panel_users(id),
  updated_by BIGINT NULL REFERENCES panel_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, plate)
);

CREATE TABLE IF NOT EXISTS panel_filter_presets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES panel_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS panel_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NULL,
  actor_user_id BIGINT NULL REFERENCES panel_users(id),
  actor_email TEXT NULL,
  actor_role TEXT NULL,
  before_data JSONB NULL,
  after_data JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panel_fleet_members_group_branch_plate
ON panel_fleet_group_members(group_id, branch_code, plate);

CREATE INDEX IF NOT EXISTS idx_panel_audit_entity_created
ON panel_audit_logs(entity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_panel_audit_actor_created
ON panel_audit_logs(actor_user_id, created_at DESC);

INSERT INTO panel_branches(code, name, display_name, aliases, immutable, active)
VALUES
  ('RJ', 'Rio de Janeiro', 'RJ - Rio de Janeiro', ARRAY['RJ', 'RIO', 'RIO DE JANEIRO'], TRUE, TRUE),
  ('RB', 'Ribeirão Preto', 'RB - Ribeirão Preto', ARRAY['RB', 'RP', 'RIBEIRAO PRETO', 'RIBEIRÃO PRETO'], TRUE, TRUE),
  ('SP', 'São Paulo', 'SP - São Paulo', ARRAY['SP', 'SBC', 'SAO PAULO', 'SÃO PAULO', 'SAO BERNARDO DO CAMPO', 'SÃO BERNARDO DO CAMPO'], TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  aliases = EXCLUDED.aliases,
  immutable = TRUE,
  active = TRUE,
  updated_at = NOW();

INSERT INTO panel_fleet_groups(name, slug, is_system)
VALUES ('Grupo consolidado Alexandre', 'grupo-consolidado-alexandre', TRUE)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
