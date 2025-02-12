import type { IWorkflowBase } from '@/index';

/**
 * Display a workflow in a readable format
 */
export function formatWorkflow(workflow: IWorkflowBase) {
	return `"${workflow.name}" (ID: ${workflow.id})`;
}
