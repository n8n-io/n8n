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

	async toDatatables(projectId?: string): Promise<void> {
		const url = projectId ? `/projects/${projectId}/datatables` : '/home/datatables';
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
	 * Navigate to personal settings
	 * URL: /settings/personal
	 */
	async toPersonalSettings(): Promise<void> {
		await this.page.goto('/settings/personal');
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
	async toWorkflow(workflowId: string = 'new'): Promise<void> {
		const url = `/workflow/${workflowId}`;
		await this.page.goto(url);
	}

	/**
	 * Navigate to a specific folder
	 * URL: /projects/{projectId}/folders/{folderId}/workflows or /home/folders/{folderId}/workflows
	 */
	async toFolder(folderId: string, projectId?: string): Promise<void> {
		const url = projectId
			? `/projects/${projectId}/folders/${folderId}/workflows`
			: `/home/folders/${folderId}/workflows`;
		await this.page.goto(url);
	}

	/**
	 * Navigate to workflow canvas (alias for toWorkflow)
	 */
	async toCanvas(workflowId: string = 'new'): Promise<void> {
		await this.toWorkflow(workflowId);
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
	 * Navigate to template onboarding flow
	 * URL: /workflows/onboarding/{templateId}
	 */
	async toOnboardingTemplate(templateId: string): Promise<void> {
		await this.page.goto(`/workflows/onboarding/${templateId}`);
	}

	/**
	 * Navigate to template import flow
	 * URL: /workflows/templates/{templateId}
	 */
	async toTemplateImport(templateId: string): Promise<void> {
		await this.page.goto(`/workflows/templates/${templateId}`);
	}

	/**
	 * Navigate to a template collection page
	 * URL: /collections/{collectionId}
	 */
	async toTemplateCollection(collectionId: number): Promise<void> {
		await this.page.goto(`/collections/${collectionId}`);
	}

	/**
	 * Navigate to template credential setup page
	 * URL: /templates/{templateId}/setup
	 */
	async toTemplateCredentialSetup(templateId: number): Promise<void> {
		await this.page.goto(`/templates/${templateId}/setup`);
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
	 * Navigate to environments settings
	 * URL: /settings/environments
	 */
	async toEnvironments(): Promise<void> {
		await this.page.goto('/settings/environments');
	}

	/**
	 * Navigate to settings page
	 * URL: /settings/chat
	 */
	async toChatHubSettings(): Promise<void> {
		await this.page.goto('/settings/chat');
	}

	/**
	 * Navigate to ChatHub chat page
	 * URL: /home/chat
	 */
	async toChatHub() {
		await this.page.goto('/home/chat');
	}

	/**
	 * Navigate to ChatHub personal agent list
	 * URL: /home/chat/personal-agents
	 */
	async toChatHubPersonalAgents() {
		await this.page.goto('/home/chat/personal-agents');
	}

	/**
	 * Navigate to ChatHub workflow agent list
	 * URL: /home/chat/workflow-agents
	 */
	async toChatHubWorkflowAgents() {
		await this.page.goto('/home/chat/workflow-agents');
	}
}
