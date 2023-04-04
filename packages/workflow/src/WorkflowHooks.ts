import type {
	IWorkflowBase,
	IWorkflowExecuteHooks,
	IWorkflowHooksOptionalParameters,
	WorkflowExecuteMode,
} from './Interfaces';

export class WorkflowHooks {
	mode: WorkflowExecuteMode;

	workflowData: IWorkflowBase;

	executionId: string;

	sessionId?: string;

	retryOf?: string;

	hookFunctions: IWorkflowExecuteHooks;

	constructor(
		hookFunctions: IWorkflowExecuteHooks,
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
		optionalParameters?: IWorkflowHooksOptionalParameters,
	) {
		// eslint-disable-next-line no-param-reassign, @typescript-eslint/prefer-nullish-coalescing
		optionalParameters = optionalParameters || {};

		this.hookFunctions = hookFunctions;
		this.mode = mode;
		this.executionId = executionId;
		this.workflowData = workflowData;
		this.sessionId = optionalParameters.sessionId;
		this.retryOf = optionalParameters.retryOf;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
	async executeHookFunctions(hookName: string, parameters: any[]) {
		if (this.hookFunctions[hookName] !== undefined && Array.isArray(this.hookFunctions[hookName])) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, no-restricted-syntax
			for (const hookFunction of this.hookFunctions[hookName]!) {
				// eslint-disable-next-line no-await-in-loop
				await hookFunction.apply(this, parameters);
			}
		}
	}
}
