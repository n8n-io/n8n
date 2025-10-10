import type { Page } from '@playwright/test';

import { AIAssistantPage } from './AIAssistantPage';
import { BecomeCreatorCTAPage } from './BecomeCreatorCTAPage';
import { CanvasPage } from './CanvasPage';
import { CommunityNodesPage } from './CommunityNodesPage';
import { BaseModal } from './components/BaseModal';
import { Breadcrumbs } from './components/Breadcrumbs';
import { CredentialsPage } from './CredentialsPage';
import { DataTableDetails } from './DataTableDetails';
import { DataTableView } from './DataTableView';
import { DemoPage } from './DemoPage';
import { ExecutionsPage } from './ExecutionsPage';
import { IframePage } from './IframePage';
import { InteractionsPage } from './InteractionsPage';
import { MfaLoginPage } from './MfaLoginPage';
import { MfaSetupModal } from './MfaSetupModal';
import { NodeDetailsViewPage } from './NodeDetailsViewPage';
import { NotificationsPage } from './NotificationsPage';
import { NpsSurveyPage } from './NpsSurveyPage';
import { ProjectSettingsPage } from './ProjectSettingsPage';
import { SettingsLogStreamingPage } from './SettingsLogStreamingPage';
import { SettingsPersonalPage } from './SettingsPersonalPage';
import { SettingsUsersPage } from './SettingsUsersPage';
import { SidebarPage } from './SidebarPage';
import { SignInPage } from './SignInPage';
import { TemplateCredentialSetupPage } from './TemplateCredentialSetupPage';
import { TemplatesPage } from './TemplatesPage';
import { VariablesPage } from './VariablesPage';
import { VersionsPage } from './VersionsPage';
import { WorkerViewPage } from './WorkerViewPage';
import { WorkflowActivationModal } from './WorkflowActivationModal';
import { WorkflowCredentialSetupModal } from './WorkflowCredentialSetupModal';
import { WorkflowSettingsModal } from './WorkflowSettingsModal';
import { WorkflowSharingModal } from './WorkflowSharingModal';
import { WorkflowsPage } from './WorkflowsPage';
import { CanvasComposer } from '../composables/CanvasComposer';
import { CredentialsComposer } from '../composables/CredentialsComposer';
import { DataTableComposer } from '../composables/DataTablesComposer';
import { ExecutionsComposer } from '../composables/ExecutionsComposer';
import { MfaComposer } from '../composables/MfaComposer';
import { NodeDetailsViewComposer } from '../composables/NodeDetailsViewComposer';
import { PartialExecutionComposer } from '../composables/PartialExecutionComposer';
import { ProjectComposer } from '../composables/ProjectComposer';
import { TemplatesComposer } from '../composables/TemplatesComposer';
import { TestEntryComposer } from '../composables/TestEntryComposer';
import { WorkflowComposer } from '../composables/WorkflowComposer';
import { NavigationHelper } from '../helpers/NavigationHelper';
import { ApiHelpers } from '../services/api-helper';

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
	readonly mfaLogin: MfaLoginPage;
	readonly ndv: NodeDetailsViewPage;
	readonly npsSurvey: NpsSurveyPage;
	readonly projectSettings: ProjectSettingsPage;
	readonly settingsPersonal: SettingsPersonalPage;
	readonly settingsLogStreaming: SettingsLogStreamingPage;
	readonly templateCredentialSetup: TemplateCredentialSetupPage;
	readonly templates: TemplatesPage;
	readonly variables: VariablesPage;
	readonly versions: VersionsPage;
	readonly workerView: WorkerViewPage;
	readonly workflows: WorkflowsPage;
	readonly notifications: NotificationsPage;
	readonly credentials: CredentialsPage;
	readonly executions: ExecutionsPage;
	readonly sideBar: SidebarPage;
	readonly dataTable: DataTableView;
	readonly dataTableDetails: DataTableDetails;

	readonly signIn: SignInPage;
	readonly settingsUsers: SettingsUsersPage;
	// Modals
	readonly workflowActivationModal: WorkflowActivationModal;
	readonly workflowCredentialSetupModal: WorkflowCredentialSetupModal;
	readonly workflowSettingsModal: WorkflowSettingsModal;
	readonly workflowSharingModal: WorkflowSharingModal;
	readonly mfaSetupModal: MfaSetupModal;
	readonly modal: BaseModal;

	// Composables
	readonly workflowComposer: WorkflowComposer;
	readonly projectComposer: ProjectComposer;
	readonly canvasComposer: CanvasComposer;
	readonly credentialsComposer: CredentialsComposer;
	readonly executionsComposer: ExecutionsComposer;
	readonly mfaComposer: MfaComposer;
	readonly partialExecutionComposer: PartialExecutionComposer;
	readonly ndvComposer: NodeDetailsViewComposer;
	readonly templatesComposer: TemplatesComposer;
	readonly start: TestEntryComposer;
	readonly dataTableComposer: DataTableComposer;

	// Helpers
	readonly navigate: NavigationHelper;
	readonly breadcrumbs: Breadcrumbs;

	constructor(page: Page) {
		this.page = page;
		this.api = new ApiHelpers(page.context().request);

		// Pages
		this.aiAssistant = new AIAssistantPage(page);
		this.becomeCreatorCTA = new BecomeCreatorCTAPage(page);
		this.canvas = new CanvasPage(page);
		this.communityNodes = new CommunityNodesPage(page);
		this.demo = new DemoPage(page);
		this.iframe = new IframePage(page);
		this.interactions = new InteractionsPage(page);
		this.mfaLogin = new MfaLoginPage(page);
		this.ndv = new NodeDetailsViewPage(page);
		this.npsSurvey = new NpsSurveyPage(page);
		this.projectSettings = new ProjectSettingsPage(page);
		this.settingsPersonal = new SettingsPersonalPage(page);
		this.settingsLogStreaming = new SettingsLogStreamingPage(page);
		this.templateCredentialSetup = new TemplateCredentialSetupPage(page);
		this.templates = new TemplatesPage(page);
		this.variables = new VariablesPage(page);
		this.versions = new VersionsPage(page);
		this.workerView = new WorkerViewPage(page);
		this.workflows = new WorkflowsPage(page);
		this.notifications = new NotificationsPage(page);
		this.credentials = new CredentialsPage(page);
		this.executions = new ExecutionsPage(page);
		this.sideBar = new SidebarPage(page);
		this.signIn = new SignInPage(page);
		this.workflowSharingModal = new WorkflowSharingModal(page);
		this.dataTable = new DataTableView(page);
		this.dataTableDetails = new DataTableDetails(page);

		this.settingsUsers = new SettingsUsersPage(page);
		// Modals
		this.workflowActivationModal = new WorkflowActivationModal(page);
		this.workflowCredentialSetupModal = new WorkflowCredentialSetupModal(page);
		this.workflowSettingsModal = new WorkflowSettingsModal(page);
		this.mfaSetupModal = new MfaSetupModal(page);
		this.modal = new BaseModal(page);

		// Composables
		this.workflowComposer = new WorkflowComposer(this);
		this.projectComposer = new ProjectComposer(this);
		this.canvasComposer = new CanvasComposer(this);
		this.credentialsComposer = new CredentialsComposer(this);
		this.executionsComposer = new ExecutionsComposer(this);
		this.mfaComposer = new MfaComposer(this);
		this.partialExecutionComposer = new PartialExecutionComposer(this);
		this.ndvComposer = new NodeDetailsViewComposer(this);
		this.templatesComposer = new TemplatesComposer(this);
		this.start = new TestEntryComposer(this);
		this.dataTableComposer = new DataTableComposer(this);

		// Helpers
		this.navigate = new NavigationHelper(page);
		this.breadcrumbs = new Breadcrumbs(page);
	}

	async goHome() {
		await this.page.goto('/');
	}
}
