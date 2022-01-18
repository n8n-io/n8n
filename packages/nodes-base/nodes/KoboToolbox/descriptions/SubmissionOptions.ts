import {
	INodeProperties,
} from 'n8n-workflow';

export const submissionOptions = [
	{
		displayName: 'Submission ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'get',
					'delete',
					'getValidation',
					'setValidation',
				],
			},
		},
		default: '',
		description:'Submission ID (number, e.g. 245128)',
	},
	{
		displayName: 'Validation Status',
		name: 'validationStatus',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'setValidation',
				],
			},
		},
		default: '',
		options: [
			{
				name: 'Approved',
				value: 'validation_status_approved',
			},
			{
				name: 'Not Approved',
				value: 'validation_status_not_approved',
			},
			{
				name: 'On Hold',
				value: 'validation_status_on_hold',
			},
		],
		description:'Desired Validation Status',
	},
] as INodeProperties[];
