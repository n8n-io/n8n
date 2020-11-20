import {
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

	constructor(hookFunctions: IWorkflowExecuteHooks, mode: WorkflowExecuteMode, executionId: string, workflowData: IWorkflowBase, optionalParameters?: IWorkflowHooksOptionalParameters) {
		optionalParameters = optionalParameters || {};

		this.hookFunctions = hookFunctions;
		this.mode = mode;
		this.executionId = executionId;
		this.workflowData = workflowData;
		this.sessionId = optionalParameters.sessionId;
		this.retryOf = optionalParameters.retryOf;
	}

	async executeHookFunctions(hookName: string, parameters: any[]) { // tslint:disable-line:no-any
		if (this.hookFunctions[hookName] !== undefined && Array.isArray(this.hookFunctions[hookName])) {
			for (const hookFunction of this.hookFunctions[hookName]!) {
				await hookFunction.apply(this, parameters);
			}
		}
	}

}
