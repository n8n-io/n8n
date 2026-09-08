import type { INodeProperties } from 'n8n-workflow';

export const paymentAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Transaction date',
		name: 'TxnDate',
		description: 'Date when the transaction occurred',
		type: 'dateTime',
		default: '',
	},
];
