-- Troque os hashes em produção com POST /api/admin/users/:id/password.
-- Hash padrão temporário: Admin@123
BEGIN;

INSERT INTO panel_users(name, username, email, password_hash, role, active)
VALUES
  ('Admin', 'admin', 'admin@transmassa.local', '$2a$10$X8G6aK8m6i2Z1j3Ag0TyeOVyM9zMwd9dgjSG7fJ6N3l8Fb5wukvTe', 'ADMIN', TRUE),
  ('TransmassaPainel', 'transmassapainel', 'transmassapainel@transmassa.local', '$2a$10$X8G6aK8m6i2Z1j3Ag0TyeOVyM9zMwd9dgjSG7fJ6N3l8Fb5wukvTe', 'PANEL', TRUE)
ON CONFLICT (email) DO NOTHING;

COMMIT;
