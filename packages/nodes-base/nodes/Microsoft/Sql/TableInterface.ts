import { IDataObject } from 'n8n-workflow';

export interface ITables {
	[key: string]: {
		[key: string]: IDataObject[];
	};
}
