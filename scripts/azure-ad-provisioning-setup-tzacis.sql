-- =============================================================================
-- Azure AD OIDC Provisioning Configuration Script
-- Pre-configured for: mis-n8n-np (Tzachi's environment)
-- =============================================================================

-- Client ID: 8573b77a-8d12-40ca-94f6-dcd075881c5b
-- Scope: api://8573b77a-8d12-40ca-94f6-dcd075881c5b/access

-- =============================================================================
-- Run this on a new environment to enable Azure AD provisioning
-- =============================================================================

-- Check current configuration
SELECT key, value FROM settings WHERE key = 'features.provisioning';

-- Insert or Update the provisioning configuration
INSERT INTO settings (key, value, "loadOnStartup")
VALUES (
    'features.provisioning',
    '{"scopesProvisionInstanceRole":true,"scopesProvisionProjectRoles":true,"scopesName":"api://8573b77a-8d12-40ca-94f6-dcd075881c5b/access","scopesInstanceRoleClaimName":"roles","scopesProjectsRolesClaimName":"roles"}',
    true
)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- Verify the update
SELECT key, value FROM settings WHERE key = 'features.provisioning';

-- =============================================================================
-- Quick Reference - Docker Compose environment variables
-- =============================================================================
-- Add to docker-compose.yaml if you want to set via env vars (optional):
--
--   - N8N_SSO_SCOPES_NAME=api://8573b77a-8d12-40ca-94f6-dcd075881c5b/access
--
-- Note: Database settings override environment variables!
-- =============================================================================

-- =============================================================================
-- To DISABLE provisioning (use only standard OIDC without role sync):
-- =============================================================================
-- UPDATE settings 
-- SET value = '{"scopesProvisionInstanceRole":false,"scopesProvisionProjectRoles":false,"scopesName":"api://8573b77a-8d12-40ca-94f6-dcd075881c5b/access","scopesInstanceRoleClaimName":"roles","scopesProjectsRolesClaimName":"roles"}'
-- WHERE key = 'features.provisioning';
-- =============================================================================
