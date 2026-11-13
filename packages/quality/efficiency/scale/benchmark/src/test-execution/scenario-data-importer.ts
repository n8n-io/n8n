import type { AuthenticatedN8nApiClient } from '@/n8n-api-client/authenticated-n8n-api-client';
import { CredentialApiClient } from '@/n8n-api-client/credentials-api-client';
import { DataTableApiClient } from '@/n8n-api-client/data-table-api-client';
import type {
	Workflow,
	Credential,
	DataTable,
	WorkflowEngineType,
} from '@/n8n-api-client/n8n-api-client.types';
import { ProjectApiClient } from '@/n8n-api-client/project-api-client';
import { WorkflowApiClient } from '@/n8n-api-client/workflows-api-client';
import type { LoadableScenarioData } from '@/scenario/scenario-data-loader';

const BENCHMARK_NAME_PREFIX = '[BENCHMARK]';

/**
 * Imports scenario data into an n8n instance
 */
export class ScenarioDataImporter {
	private readonly workflowApiClient: WorkflowApiClient;
	private readonly credentialApiClient: CredentialApiClient;
	private readonly dataTableApiClient: DataTableApiClient;
	private readonly projectApiClient: ProjectApiClient;

	constructor(
		n8nApiClient: AuthenticatedN8nApiClient,
		/** When set, every imported workflow runs on this execution engine */
		private readonly engineType?: WorkflowEngineType,
	) {
		this.workflowApiClient = new WorkflowApiClient(n8nApiClient);
		this.credentialApiClient = new CredentialApiClient(n8nApiClient);
		this.dataTableApiClient = new DataTableApiClient(n8nApiClient);
		this.projectApiClient = new ProjectApiClient(n8nApiClient);
	}

	private replaceValuesInObject(obj: unknown, searchText: string, targetText: string) {
		if (Array.isArray(obj)) {
			obj.map((item) => this.replaceValuesInObject(item, searchText, targetText));
		} else if (typeof obj === 'object' && obj !== null) {
			for (const [key, value] of Object.entries(obj)) {
				if (typeof value === 'string' && value === searchText) {
					(obj as Record<string, unknown>)[key] = targetText;
				} else {
					this.replaceValuesInObject(value, searchText, targetText);
				}
			}
		}
	}

	async importTestScenarioData(data: LoadableScenarioData) {
		const existingWorkflows = await this.workflowApiClient.getAllWorkflows();
		const existingCredentials = await this.credentialApiClient.getAllCredentials();
		const existingDataTables = await this.dataTableApiClient.getAllDataTables();

		for (const credential of data.credentials) {
			const createdCredential = await this.importCredentials({ existingCredentials, credential });

			// We need to update the id and name of the credential in the workflows
			for (const workflow of data.workflows) {
				this.replaceValuesInObject(workflow, credential.id, createdCredential.id);
				this.replaceValuesInObject(workflow, credential.name, createdCredential.name);
			}
		}

		for (const workflow of data.workflows) {
			await this.importWorkflow({ existingWorkflows, workflow });
		}

		let dataTableId: string | undefined;
		if (data.dataTable) {
			dataTableId = await this.importDataTable({ existingDataTables, dataTable: data.dataTable });
		}

		return { dataTableId };
	}

	/**
	 * Imports a single credential into n8n removing any existing credentials with the same name
	 * @param opts
	 * @returns
	 */
	private async importCredentials(opts: {
		existingCredentials: Credential[];
		credential: Credential;
	}) {
		const existingCredentials = this.findExistingCredentials(
			opts.existingCredentials,
			opts.credential,
		);
		if (existingCredentials.length > 0) {
			for (const toDelete of existingCredentials) {
				await this.credentialApiClient.deleteCredential(toDelete.id);
			}
		}

		return await this.credentialApiClient.createCredential({
			...opts.credential,
			name: this.getBenchmarkCredentialName(opts.credential),
		});
	}

	private async importDataTable(opts: { existingDataTables: DataTable[]; dataTable: DataTable }) {
		const { existingDataTables, dataTable } = opts;

		const projectId = await this.projectApiClient.getPersonalProject();

		const existingTable = existingDataTables.find(
			(dt) => dt.name === this.getBenchmarkDataTableName(dataTable),
		);

		if (existingTable) {
			await this.dataTableApiClient.deleteDataTable(projectId, existingTable.id);
		}

		const { id } = await this.dataTableApiClient.createDataTable(projectId, {
			...dataTable,
			name: this.getBenchmarkDataTableName(dataTable),
		});

		return id;
	}

	/**
	 * Imports a single workflow into n8n removing any existing benchmark workflows with the same name or id.
	 * The workflow keeps the id from its file, so other workflows can reference it (e.g. as a sub-workflow).
	 * Fails if a workflow that the benchmark did not create uses the same id
	 */
	private async importWorkflow(opts: { existingWorkflows: Workflow[]; workflow: Workflow }) {
		const existingWorkflows = this.findExistingWorkflows(opts.existingWorkflows, opts.workflow);
		if (existingWorkflows.length > 0) {
			for (const toDelete of existingWorkflows) {
				// The workflow is already archived when an earlier run failed to delete it
				if (!toDelete.isArchived) {
					await this.workflowApiClient.archiveWorkflow(toDelete.id);
				}
				await this.workflowApiClient.deleteWorkflow(toDelete.id);
			}
		}

		const createdWorkflow = await this.workflowApiClient.createWorkflow({
			...opts.workflow,
			name: this.getBenchmarkWorkflowName(opts.workflow),
			...(this.engineType
				? { settings: { ...opts.workflow.settings, engineType: this.engineType } }
				: {}),
		});

		return await this.workflowApiClient.activateWorkflow(createdWorkflow);
	}

	private findExistingCredentials(
		existingCredentials: Credential[],
		credentialToImport: Credential,
	): Credential[] {
		const benchmarkCredentialName = this.getBenchmarkCredentialName(credentialToImport);

		return existingCredentials.filter(
			(existingCredential) => existingCredential.name === benchmarkCredentialName,
		);
	}

	private findExistingWorkflows(
		existingWorkflows: Workflow[],
		workflowToImport: Workflow,
	): Workflow[] {
		const benchmarkWorkflowName = this.getBenchmarkWorkflowName(workflowToImport);

		const workflowWithSameId = existingWorkflows.find(
			(existingWorkflow) =>
				workflowToImport.id !== undefined && existingWorkflow.id === workflowToImport.id,
		);
		// Only delete workflows that the benchmark created
		if (workflowWithSameId && !this.isBenchmarkWorkflow(workflowWithSameId)) {
			throw new Error(
				`Cannot import workflow "${workflowToImport.name}": workflow "${workflowWithSameId.name}" already uses the id ${workflowToImport.id}`,
			);
		}

		return existingWorkflows.filter(
			(existingWorkflow) =>
				existingWorkflow.name === benchmarkWorkflowName || existingWorkflow === workflowWithSameId,
		);
	}

	private getBenchmarkCredentialName(credential: Credential) {
		return `${BENCHMARK_NAME_PREFIX} ${credential.name}`;
	}

	private getBenchmarkWorkflowName(workflow: Workflow) {
		return `${BENCHMARK_NAME_PREFIX} ${workflow.name}`;
	}

	private isBenchmarkWorkflow(workflow: Workflow) {
		return workflow.name.startsWith(`${BENCHMARK_NAME_PREFIX} `);
	}

	private getBenchmarkDataTableName(dataTable: DataTable) {
		return `${BENCHMARK_NAME_PREFIX} ${dataTable.name}`;
	}
}
