-- =============================================================================
-- Azure AD OIDC Provisioning Configuration Script
-- =============================================================================
-- This script configures n8n's SSO provisioning to work with Azure AD
-- (Microsoft Entra ID) for role-based access provisioning.
--
-- Prerequisites:
-- 1. Azure AD App Registration configured with:
--    - Exposed API with scope (e.g., "access")
--    - App Roles for instance roles (global:admin, global:member)
--    - App Roles for project roles (projectId:role format)
--    - Users assigned to App Roles in Enterprise Applications
--
-- 2. n8n OIDC SSO configured with:
--    - Discovery Endpoint: https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration
--    - Client ID: Your Azure AD App Client ID
--    - Client Secret: Your Azure AD App Client Secret
-- =============================================================================

-- Replace these values with your Azure AD configuration:
-- YOUR_CLIENT_ID: Your Azure AD Application (client) ID

-- =============================================================================
-- Option 1: INSERT if the setting doesn't exist
-- =============================================================================
INSERT INTO settings (key, value, "loadOnStartup")
SELECT 
    'features.provisioning',
    '{
        "scopesProvisionInstanceRole": true,
        "scopesProvisionProjectRoles": true,
        "scopesName": "api://YOUR_CLIENT_ID/access",
        "scopesInstanceRoleClaimName": "roles",
        "scopesProjectsRolesClaimName": "roles"
    }',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM settings WHERE key = 'features.provisioning'
);

-- =============================================================================
-- Option 2: UPDATE if the setting already exists
-- =============================================================================
UPDATE settings 
SET value = '{
    "scopesProvisionInstanceRole": true,
    "scopesProvisionProjectRoles": true,
    "scopesName": "api://YOUR_CLIENT_ID/access",
    "scopesInstanceRoleClaimName": "roles",
    "scopesProjectsRolesClaimName": "roles"
}'
WHERE key = 'features.provisioning';

-- =============================================================================
-- Verification Query - Run this to check your configuration
-- =============================================================================
-- SELECT key, value FROM settings WHERE key = 'features.provisioning';

-- =============================================================================
-- Configuration Reference
-- =============================================================================
--
-- | Setting                       | Value                              | Description                                    |
-- |-------------------------------|------------------------------------|-------------------------------------------------|
-- | scopesProvisionInstanceRole   | true                               | Enable instance role provisioning              |
-- | scopesProvisionProjectRoles   | true                               | Enable project role provisioning               |
-- | scopesName                    | api://<client-id>/access           | Full Azure AD scope URI                        |
-- | scopesInstanceRoleClaimName   | roles                              | Azure AD claim for App Roles (standard)        |
-- | scopesProjectsRolesClaimName  | roles                              | Azure AD claim for App Roles (standard)        |
--
-- =============================================================================
-- Azure AD App Roles Configuration
-- =============================================================================
--
-- In Azure AD App Registration → App roles, create:
--
-- Instance Roles:
--   - Value: "global:admin"   → Display name: "n8n Global Admin"
--   - Value: "global:member"  → Display name: "n8n Member"
--
-- Project Roles (format: projectId:role):
--   - Value: "rUm9h0bmvc65Zh5e:admin"   → Display name: "Project X Admin"
--   - Value: "rUm9h0bmvc65Zh5e:editor"  → Display name: "Project X Editor"
--   - Value: "rUm9h0bmvc65Zh5e:viewer"  → Display name: "Project X Viewer"
--
-- Then assign users to these roles in:
-- Azure AD → Enterprise Applications → Your App → Users and groups
--
-- =============================================================================
