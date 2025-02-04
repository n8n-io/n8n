import type { IWorkflowBase, IWorkflowExecuteHooks, WorkflowExecuteMode } from './Interfaces';

export class WorkflowHooks {
	mode: WorkflowExecuteMode;

	workflowData: IWorkflowBase;

	executionId: string;

	hookFunctions: IWorkflowExecuteHooks;

	constructor(
		hookFunctions: IWorkflowExecuteHooks,
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
	) {
		this.hookFunctions = hookFunctions;
		this.mode = mode;
		this.executionId = executionId;
		this.workflowData = workflowData;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async executeHookFunctions(hookName: string, parameters: any[]) {
		const hooks = this.hookFunctions[hookName];
		if (hooks !== undefined && Array.isArray(hooks)) {
			for (const hookFunction of hooks) {
				await hookFunction.apply(this, parameters);
			}
		}
	}
}
