import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

export async function executeNode(
	node: IExecuteFunctions,
	input: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// Mock node execution
	return input;
}
