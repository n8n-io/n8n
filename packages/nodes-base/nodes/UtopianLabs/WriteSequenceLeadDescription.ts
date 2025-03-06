import type { INodeProperties } from 'n8n-workflow';

export const writeSequenceLeadFields: INodeProperties[] = [
	{
		displayName: 'Agent',
		name: 'agent',
		type: 'options',
		required: true,
		default: 'r1-copywriting',
		options: [
			{
				name: 'Copywriting Agent',
				value: 'r1-copywriting',
			},
			{
				name: 'Copywriting Agent Light',
				value: 'r1-copywriting-light',
			},
		],
		description: 'The agent to use for writing the email',
		displayOptions: {
			show: {
				operation: ['writeEmailSequence'],
			},
		},
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'options',
		required: true,
		default: 'en-US',
		options: [
			{
				name: 'British English',
				value: 'en-UK',
			},
			{
				name: 'American English',
				value: 'en-US',
			},
			{
				name: 'Dutch',
				value: 'nl',
			},
			{
				name: 'German',
				value: 'de',
			},
			{
				name: 'French',
				value: 'fr',
			},
			{
				name: 'Spanish',
				value: 'es',
			},
			{
				name: 'Portuguese',
				value: 'pt',
			},
			{
				name: 'Italian',
				value: 'it',
			},
		],
		description: 'The language to use for the email',
		displayOptions: {
			show: {
				operation: ['writeEmailSequence'],
			},
		},
	},

	{
		displayName: 'Number of Emails',
		name: 'numOfSequenceSteps',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['writeEmailSequence'],
			},
		},
		default: 3,
		description: 'The number of emails to generate in the sequence',
		typeOptions: {
			minValue: 2,
			maxValue: 5,
		},
	},
];
