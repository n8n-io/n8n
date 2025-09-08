import type { Page } from '@playwright/test';

/**
 * NavigationHelper provides centralized navigation methods for all n8n routes.
 * Handles both project-specific and global routes with proper URL construction.
 *
 * URLs are documented to help users understand where they're navigating:
 * - Home workflows: /home/workflows
 * - Project workflows: /projects/{projectId}/workflows
 * - Variables: /variables (global only, no project scope)
 * - Settings: /settings (global only)
 * - Credentials: /home/credentials or /projects/{projectId}/credentials
 * - Executions: /home/executions or /projects/{projectId}/executions
 */
export class NavigationHelper {
	constructor(private page: Page) {}

	/**
	 * Navigate to the home dashboard
	 * URL: /home
	 */
	async toHome(): Promise<void> {
		await this.page.goto('/home');
	}

	/**
	 * Navigate to workflows page
	 * URLs:
	 * - Home workflows: /home/workflows
	 * - Project workflows: /projects/{projectId}/workflows
	 */
	async toWorkflows(projectId?: string): Promise<void> {
		const url = projectId ? `/projects/${projectId}/workflows` : '/home/workflows';
		await this.page.goto(url);
	}

	/**
	 * Navigate to credentials page
	 * URLs:
	 * - Home credentials: /home/credentials
	 * - Project credentials: /projects/{projectId}/credentials
	 */
	async toCredentials(projectId?: string): Promise<void> {
		const url = projectId ? `/projects/${projectId}/credentials` : '/home/credentials';
		await this.page.goto(url);
	}

	/**
	 * Navigate to executions page
	 * URLs:
	 * - Home executions: /home/executions
	 * - Project executions: /projects/{projectId}/executions
	 */
	async toExecutions(projectId?: string): Promise<void> {
		const url = projectId ? `/projects/${projectId}/executions` : '/home/executions';
		await this.page.goto(url);
	}

	/**
	 * Navigate to variables page (global only)
	 * URL: /variables
	 * Note: Variables are global and don't have project-specific scoping
	 */
	async toVariables(): Promise<void> {
		await this.page.goto('/variables');
	}

	/**
	 * Navigate to settings page (global only)
	 * URL: /settings
	 */
	async toSettings(): Promise<void> {
		await this.page.goto('/settings');
	}

	/**
	 * Navigate to personal settings
	 * URL: /settings/personal
	 */
	async toPersonalSettings(): Promise<void> {
		await this.page.goto('/settings/personal');
	}

	/**
	 * Navigate to projects page
	 * URL: /projects
	 */
	async toProjects(): Promise<void> {
		await this.page.goto('/projects');
	}

	/**
	 * Navigate to a specific project's dashboard
	 * URL: /projects/{projectId}
	 */
	async toProject(projectId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}`);
	}

	/**
	 * Navigate to project settings
	 * URL: /projects/{projectId}/settings
	 */
	async toProjectSettings(projectId: string): Promise<void> {
		await this.page.goto(`/projects/${projectId}/settings`);
	}

	/**
	 * Navigate to a specific workflow
	 * URLs:
	 * - New workflow: /workflow/new
	 * - Existing workflow: /workflow/{workflowId}
	 * - Project workflow: /projects/{projectId}/workflow/{workflowId}
	 */
	async toWorkflow(workflowId: string = 'new', projectId?: string): Promise<void> {
		const url = projectId
			? `/projects/${projectId}/workflow/${workflowId}`
			: `/workflow/${workflowId}`;
		await this.page.goto(url);
	}

	/**
	 * Navigate to workflow canvas (alias for toWorkflow)
	 */
	async toCanvas(workflowId: string = 'new', projectId?: string): Promise<void> {
		await this.toWorkflow(workflowId, projectId);
	}

	/**
	 * Navigate to templates page
	 * URL: /templates
	 */
	async toTemplates(): Promise<void> {
		await this.page.goto('/templates');
	}

	/**
	 * Navigate to a specific template
	 * URL: /templates/{templateId}
	 */
	async toTemplate(templateId: string): Promise<void> {
		await this.page.goto(`/templates/${templateId}`);
	}

	/**
	 * Navigate to community nodes
	 * URL: /settings/community-nodes
	 */
	async toCommunityNodes(): Promise<void> {
		await this.page.goto('/settings/community-nodes');
	}

	/**
	 * Navigate to log streaming settings
	 * URL: /settings/log-streaming
	 */
	async toLogStreaming(): Promise<void> {
		await this.page.goto('/settings/log-streaming');
	}

	/**
	 * Navigate to worker view
	 * URL: /settings/workers
	 */
	async toWorkerView(): Promise<void> {
		await this.page.goto('/settings/workers');
	}

	/**
	 * Navigate to users management
	 * URL: /settings/users
	 */
	async toUsers(): Promise<void> {
		await this.page.goto('/settings/users');
	}

	/**
	 * Navigate to API settings
	 * URL: /settings/api
	 */
	async toApiSettings(): Promise<void> {
		await this.page.goto('/settings/api');
	}

	/**
	 * Navigate to LDAP settings
	 * URL: /settings/ldap
	 */
	async toLdapSettings(): Promise<void> {
		await this.page.goto('/settings/ldap');
	}

	/**
	 * Navigate to SSO settings
	 * URL: /settings/sso
	 */
	async toSsoSettings(): Promise<void> {
		await this.page.goto('/settings/sso');
	}

	/**
	 * Navigate to source control settings
	 * URL: /settings/source-control
	 */
	async toSourceControl(): Promise<void> {
		await this.page.goto('/settings/source-control');
	}

	/**
	 * Navigate to external secrets settings
	 * URL: /settings/external-secrets
	 */
	async toExternalSecrets(): Promise<void> {
		await this.page.goto('/settings/external-secrets');
	}
}
