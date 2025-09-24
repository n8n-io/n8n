/**
 * Workflow configuration
 */
export interface WorkflowOpts {
	/** Workflow name */
	name?: string;
	/** Execution order version (default: v1) */
	executionOrder?: 'v0' | 'v1';
	/** Data retention for failed executions */
	saveDataErrorExecution?: 'all' | 'none';
	/** Data retention for successful executions */
	saveDataSuccessExecution?: 'all' | 'none';
	/** Whether to save manual executions */
	saveManualExecutions?: boolean;
	/** Workflow timezone */
	timezone?: string;
	/** Whether workflow is active (default: true) */
	active?: boolean;
}
