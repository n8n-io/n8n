import type { INode, IConnections } from 'n8n-workflow';

export interface WorkflowTestData {
	description: string;
	input: {
		workflowData: {
			nodes: INode[];
			connections: IConnections;
		};
	};
	output: {
		nodeExecutionOrder?: string[];
		nodeData: {
			[key: string]: any[][];
		};
	};
}
