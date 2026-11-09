/**
 * n8n workflow. This is a simplified version of the actual workflow object.
 */
export type Workflow = {
	id: string;
	name: string;
	versionId: string;
	tags?: string[];
	settings?: Record<string, unknown>;
};

export const WORKFLOW_ENGINE_TYPES = ['v1', 'v2'] as const;

export type WorkflowEngineType = (typeof WORKFLOW_ENGINE_TYPES)[number];

export type Credential = {
	id: string;
	name: string;
	type: string;
};

export type DataTableColumn = {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date';
};

export type DataTable = {
	id?: string;
	projectId?: number;
	name: string;
	columns: DataTableColumn[];
};
