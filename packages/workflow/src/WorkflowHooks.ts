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

	pushRef?: string;

	retryOf?: string;

	hookFunctions: IWorkflowExecuteHooks;

	constructor(
		hookFunctions: IWorkflowExecuteHooks,
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
		optionalParameters?: IWorkflowHooksOptionalParameters,
	) {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		optionalParameters = optionalParameters || {};

		this.hookFunctions = hookFunctions;
		this.mode = mode;
		this.executionId = executionId;
		this.workflowData = workflowData;
		this.pushRef = optionalParameters.pushRef;
		// retryOf might be `null` from TypeORM
		this.retryOf = optionalParameters.retryOf ?? undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async executeHookFunctions<HookName extends keyof IWorkflowExecuteHooks>(
		hookName: HookName,
		parameters: Parameters<NonNullable<IWorkflowExecuteHooks[HookName]>[number]>,
	) {
		const hooks = this.hookFunctions[hookName];
		if (hooks !== undefined && Array.isArray(hooks)) {
			for (const hookFunction of hooks) {
				// Necessary because TS can't narrow down the type correctly yet.
				const typedHookFunction = hookFunction as (
					...args: Parameters<NonNullable<IWorkflowExecuteHooks[HookName]>[number]>
				) => Promise<void>;
				await typedHookFunction.apply(this, parameters);
			}
		}
	}
}
