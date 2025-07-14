import type { IDataObject } from 'n8n-workflow';

export interface ITables {
	[key: string]: {
		[key: string]: IDataObject[];
	};
}

export type OperationInputData = {
	table: string;
	columnString: string;
	items: IDataObject[];
};
