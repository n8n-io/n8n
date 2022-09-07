import { IDataObject } from 'n8n-workflow';

export type ICronExpression = [
	string | Date,
	string | Date,
	string | Date,
	string | Date,
	string | Date,
];
