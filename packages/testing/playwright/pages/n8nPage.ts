import type { Page } from '@playwright/test';

import { AIAssistantPage } from './AIAssistantPage';
import { BecomeCreatorCTAPage } from './BecomeCreatorCTAPage';
import { CanvasPage } from './CanvasPage';
import { CommunityNodesPage } from './CommunityNodesPage';
import { CredentialsPage } from './CredentialsPage';
import { DemoPage } from './DemoPage';
import { ExecutionsPage } from './ExecutionsPage';
import { IframePage } from './IframePage';
import { InteractionsPage } from './InteractionsPage';
import { NodeDetailsViewPage } from './NodeDetailsViewPage';
import { NotificationsPage } from './NotificationsPage';
import { NpsSurveyPage } from './NpsSurveyPage';
import { ProjectSettingsPage } from './ProjectSettingsPage';
import { SettingsLogStreamingPage } from './SettingsLogStreamingPage';
import { SettingsPage } from './SettingsPage';
import { SidebarPage } from './SidebarPage';
import { VariablesPage } from './VariablesPage';
import { VersionsPage } from './VersionsPage';
import { WorkerViewPage } from './WorkerViewPage';
import { WorkflowActivationModal } from './WorkflowActivationModal';
import { WorkflowSettingsModal } from './WorkflowSettingsModal';
import { WorkflowSharingModal } from './WorkflowSharingModal';
import { WorkflowsPage } from './WorkflowsPage';
import { CanvasComposer } from '../composables/CanvasComposer';
import { CredentialsComposer } from '../composables/CredentialsComposer';
import { PartialExecutionComposer } from '../composables/PartialExecutionComposer';
import { ProjectComposer } from '../composables/ProjectComposer';
import { TestEntryComposer } from '../composables/TestEntryComposer';
import { WorkflowComposer } from '../composables/WorkflowComposer';
import { NavigationHelper } from '../helpers/NavigationHelper';
import type { ApiHelpers } from '../services/api-helper';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class n8nPage {
	readonly page: Page;
	readonly api: ApiHelpers;

	// Pages
	readonly aiAssistant: AIAssistantPage;
	readonly becomeCreatorCTA: BecomeCreatorCTAPage;
	readonly canvas: CanvasPage;
	readonly communityNodes: CommunityNodesPage;
	readonly demo: DemoPage;
	readonly iframe: IframePage;
	readonly interactions: InteractionsPage;
	readonly ndv: NodeDetailsViewPage;
	readonly npsSurvey: NpsSurveyPage;
	readonly projectSettings: ProjectSettingsPage;
	readonly settings: SettingsPage;
	readonly settingsLogStreaming: SettingsLogStreamingPage;
	readonly variables: VariablesPage;
	readonly versions: VersionsPage;
	readonly workerView: WorkerViewPage;
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
	readonly credentialsComposer: CredentialsComposer;
	readonly partialExecutionComposer: PartialExecutionComposer;
	readonly start: TestEntryComposer;

	// Helpers
	readonly navigate: NavigationHelper;

	constructor(page: Page, api: ApiHelpers) {
		this.page = page;
		this.api = api;

		// Pages
		this.aiAssistant = new AIAssistantPage(page);
		this.becomeCreatorCTA = new BecomeCreatorCTAPage(page);
		this.canvas = new CanvasPage(page);
		this.communityNodes = new CommunityNodesPage(page);
		this.demo = new DemoPage(page);
		this.iframe = new IframePage(page);
		this.interactions = new InteractionsPage(page);
		this.ndv = new NodeDetailsViewPage(page);
		this.npsSurvey = new NpsSurveyPage(page);
		this.projectSettings = new ProjectSettingsPage(page);
		this.settings = new SettingsPage(page);
		this.settingsLogStreaming = new SettingsLogStreamingPage(page);
		this.variables = new VariablesPage(page);
		this.versions = new VersionsPage(page);
		this.workerView = new WorkerViewPage(page);
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
		this.credentialsComposer = new CredentialsComposer(this);
		this.partialExecutionComposer = new PartialExecutionComposer(this);
		this.start = new TestEntryComposer(this);

		// Helpers
		this.navigate = new NavigationHelper(page);
	}

	async goHome() {
		await this.page.goto('/');
	}
}
