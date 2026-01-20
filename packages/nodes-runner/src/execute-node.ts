import type { INodeExecutionData } from 'n8n-workflow';

type ExecuteNode = (params: {
	package: string;
	accessKey: string;
	nodeVersion?: string | number | symbol;
}) => Promise<INodeExecutionData[][]>;
