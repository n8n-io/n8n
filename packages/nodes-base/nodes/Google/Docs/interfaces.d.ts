import { IDataObject } from 'n8n-workflow';

export interface IUpdateBody extends IDataObject {
	requests: IDataObject[];
	writeControl?: { [key: string]: string };
}

export interface IUpdateFields {
	writeControlObject: {
		control: string,
		value: string,
	};
}
