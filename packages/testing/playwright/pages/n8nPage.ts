import type { Page } from '@playwright/test';

import { AIAssistantPage } from './AIAssistantPage';
import { BecomeCreatorCTAPage } from './BecomeCreatorCTAPage';
import { CanvasPage } from './CanvasPage';
import { CredentialsPage } from './CredentialsPage';
import { ExecutionsPage } from './ExecutionsPage';
import { IframePage } from './IframePage';
import { NodeDisplayViewPage } from './NodeDisplayViewPage';
import { NotificationsPage } from './NotificationsPage';
import { NpsSurveyPage } from './NpsSurveyPage';
import { ProjectSettingsPage } from './ProjectSettingsPage';
import { SettingsPage } from './SettingsPage';
import { SidebarPage } from './SidebarPage';
import { VersionsPage } from './VersionsPage';
import { WorkflowActivationModal } from './WorkflowActivationModal';
import { WorkflowSettingsModal } from './WorkflowSettingsModal';
import { WorkflowSharingModal } from './WorkflowSharingModal';
import { WorkflowsPage } from './WorkflowsPage';
import { CanvasComposer } from '../composables/CanvasComposer';
import { ProjectComposer } from '../composables/ProjectComposer';
import { TestEntryComposer } from '../composables/TestEntryComposer';
import { WorkflowComposer } from '../composables/WorkflowComposer';
import type { ApiHelpers } from '../services/api-helper';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class n8nPage {
	readonly page: Page;
	readonly api: ApiHelpers;

	// Pages
	readonly aiAssistant: AIAssistantPage;
	readonly becomeCreatorCTA: BecomeCreatorCTAPage;
	readonly canvas: CanvasPage;

	readonly iframe: IframePage;
	readonly ndv: NodeDisplayViewPage;
	readonly npsSurvey: NpsSurveyPage;
	readonly projectSettings: ProjectSettingsPage;
	readonly settings: SettingsPage;
	readonly versions: VersionsPage;
	readonly workflows: WorkflowsPage;
	readonly notifications: NotificationsPage;
	readonly credentials: CredentialsPage;
	readonly executions: ExecutionsPage;
	readonly sideBar: SidebarPage;

	// Modals
	readonly workflowActivationModal: WorkflowActivationModal;
	readonly workflowSettingsModal: WorkflowSettingsModal;
	readonly workflowSharingModal: WorkflowSharingModal;

	// Composables
	readonly workflowComposer: WorkflowComposer;
	readonly projectComposer: ProjectComposer;
	readonly canvasComposer: CanvasComposer;
	readonly start: TestEntryComposer;

	constructor(page: Page, api: ApiHelpers) {
		this.page = page;
		this.api = api;

		// Pages
		this.aiAssistant = new AIAssistantPage(page);
		this.becomeCreatorCTA = new BecomeCreatorCTAPage(page);
		this.canvas = new CanvasPage(page);

		this.iframe = new IframePage(page);
		this.ndv = new NodeDisplayViewPage(page);
		this.npsSurvey = new NpsSurveyPage(page);
		this.projectSettings = new ProjectSettingsPage(page);
		this.settings = new SettingsPage(page);
		this.versions = new VersionsPage(page);
		this.workflows = new WorkflowsPage(page);
		this.notifications = new NotificationsPage(page);
		this.credentials = new CredentialsPage(page);
		this.executions = new ExecutionsPage(page);
		this.sideBar = new SidebarPage(page);
		this.workflowSharingModal = new WorkflowSharingModal(page);

		// Modals
		this.workflowActivationModal = new WorkflowActivationModal(page);
		this.workflowSettingsModal = new WorkflowSettingsModal(page);

		// Composables
		this.workflowComposer = new WorkflowComposer(this);
		this.projectComposer = new ProjectComposer(this);
		this.canvasComposer = new CanvasComposer(this);
		this.start = new TestEntryComposer(this);
	}

	async goHome() {
		await this.page.goto('/');
	}
}
