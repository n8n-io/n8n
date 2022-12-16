import {
	INode,
	IConnections,
} from 'n8n-workflow';

export interface WorkflowTestData {
	description: string;
	input: {
		workflowData: {
			nodes: INode[];
			connections: IConnections;
		};
	};
	output: {
		nodeData: {
			[key: string]: any[][];
		};
	};
}
