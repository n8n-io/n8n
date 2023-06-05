import type { INode, IConnections } from 'n8n-workflow';

export interface WorkflowTestData {
	description: string;
	input: {
		workflowData: {
			nodes: INode[];
			connections: IConnections;
			settings?: {
				saveManualExecutions: boolean;
				callerPolicy: string;
				timezone: string;
				saveExecutionProgress: string;
			};
		};
	};
	output: {
		nodeExecutionOrder?: string[];
		nodeData: {
			[key: string]: any[][];
		};
	};
}
