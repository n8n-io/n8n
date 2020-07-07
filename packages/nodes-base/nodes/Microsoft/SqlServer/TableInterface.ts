import { INodeExecutionData } from 'n8n-workflow';

export interface ITable {
	[key: string]: {
		[key: string]: Array<INodeExecutionData>;
	};
}
