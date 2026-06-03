-- Migration: production_monitoring
-- Extends audit_logs with full tracing fields, adds composite indexes for dashboard queries.

-- Add missing columns to audit_logs (idempotent with IF NOT EXISTS)
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_id   UUID,
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS trace_id    VARCHAR(36),
  ADD COLUMN IF NOT EXISTS request_id  VARCHAR(36),
  ADD COLUMN IF NOT EXISTS before_json JSONB,
  ADD COLUMN IF NOT EXISTS after_json  JSONB,
  ADD COLUMN IF NOT EXISTS metadata    JSONB;

-- Rename ip_address → ip for consistency with new service
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'ip'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN ip_address TO ip;
  END IF;
END $$;

-- Additional composite indexes for audit log dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_created
  ON audit_logs (actor_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_target
  ON audit_logs (target_id, target_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_trace
  ON audit_logs (trace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_created
  ON audit_logs (action, created_at DESC);
