import type { INodeProperties } from 'n8n-workflow';

export const classifyLeadFields: INodeProperties[] = [
	{
		displayName: 'Agent',
		name: 'agent',
		type: 'options',
		required: true,
		default: 'r1-classification',
		options: [
			{
				name: 'Classification Agent',
				value: 'r1-classification',
			},
			{
				name: 'Classification Agent Light',
				value: 'r1-classification-light',
			},
		],
		description: 'The agent to use for the classification run',
		displayOptions: {
			show: {
				operation: ['categorizeLead'],
			},
		},
	},
	{
		displayName: 'Classification Name 1',
		name: 'classificationNameOne',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the first classification option',
		displayOptions: {
			show: {
				operation: ['categorizeLead'],
			},
		},
	},
	{
		displayName: 'Classification Description 1',
		name: 'classificationDescriptionOne',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		description: 'Description of the first classification option',
		displayOptions: {
			show: {
				operation: ['categorizeLead'],
			},
		},
	},
	{
		displayName: 'Classification Name 2',
		name: 'classificationNameTwo',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the second classification option',
		displayOptions: {
			show: {
				operation: ['categorizeLead'],
			},
		},
	},
	{
		displayName: 'Classification Description 2',
		name: 'classificationDescriptionTwo',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		description: 'Description of the second classification option',
		displayOptions: {
			show: {
				operation: ['categorizeLead'],
			},
		},
	},
	// Additional classifications
	{
		displayName: 'Additional Classifications',
		name: 'additionalClassifications',
		type: 'collection',
		placeholder: 'Add Classification',
		default: {},
		displayOptions: {
			show: {
				operation: ['categorizeLead'],
			},
		},
		options: [
			{
				displayName: 'Classification Name 3',
				name: 'classificationNameThree',
				type: 'string',
				default: '',
				description: 'Name of the third classification option',
			},
			{
				displayName: 'Classification Description 3',
				name: 'classificationDescriptionThree',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the third classification option',
			},
			{
				displayName: 'Classification Name 4',
				name: 'classificationNameFour',
				type: 'string',
				default: '',
				description: 'Name of the fourth classification option',
			},
			{
				displayName: 'Classification Description 4',
				name: 'classificationDescriptionFour',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the fourth classification option',
			},
			{
				displayName: 'Classification Name 5',
				name: 'classificationNameFive',
				type: 'string',
				default: '',
				description: 'Name of the fifth classification option',
			},
			{
				displayName: 'Classification Description 5',
				name: 'classificationDescriptionFive',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Description of the fifth classification option',
			},
		],
	},
];
