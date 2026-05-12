import type { WorkflowExecuteMode } from './interfaces';

/**
 * Returns true for execution modes that are interactive — the user is
 * actively running something and expects synchronous feedback. These modes
 * skip queueing, soft-delete unsaved executions, run inline, etc.
 */
export function isInteractiveExecution(mode: WorkflowExecuteMode): boolean {
	return mode === 'manual' || mode === 'single-node';
}
