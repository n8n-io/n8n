import type { INodeProperties } from 'n8n-workflow';

export const DataToSendOption: INodeProperties[] = [
	{
		displayName: 'Data to send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map input data to columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define below for each column',
				value: 'mapWithFields',
				description: 'Set the value for each destination column',
			},
		],
		default: 'mapWithFields',
		description: 'Whether to insert the input data this node receives in the new row',
	},
];

export const RowCreateUpdateOptions: INodeProperties[] = [
	{
		displayName:
			"In this mode, make sure the incoming data fields are named the same as the columns in NocoDB. (Use an 'Edit Fields' node before this node to change them if required.)",
		name: 'info',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataToSend: ['autoMapInputData'],
			},
		},
	},
	{
		displayName: 'Inputs to ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				dataToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
];
