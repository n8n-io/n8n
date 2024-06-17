import type { INodeExecutionData, Workflow, WorkflowExecuteMode } from '.';

export function getPinDataIfManualExecution(
	workflow: Workflow,
	nodeName: string,
	mode: WorkflowExecuteMode,
): INodeExecutionData[] | undefined {
	const pinData = workflow.getPinDataOfNode(nodeName);
	if (pinData && mode === 'manual') {
		return pinData;
	}

	return undefined;
}
