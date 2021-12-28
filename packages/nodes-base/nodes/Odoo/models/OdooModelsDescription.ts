import { INodeProperties } from 'n8n-workflow';
import {
	calendarEventFields,
	crmLeadFields,
	noteNoteFields,
	resPartnerFields,
	stockPickingFields,
} from './CreateModelOptions';

export const noteNoteDescription: INodeProperties[] = [
	{
		displayName: 'Fields To Include',
		name: 'fieldsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Choose fields to be returned',
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['note.note'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields To Be Returnedd',
				name: 'fields',
				values: [
					{
						displayName: 'Choose From List',
						name: 'fromList',
						type: 'boolean',
						default: false,
						description: 'Enter field name or choose it from list.',
					},
					{
						displayName: 'Field:',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Enter field name',
						placeholder: '',
						displayOptions: {
							show: {
								fromList: [false],
							},
						},
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						default: '',
						noDataExpression: true,
						displayOptions: {
							show: {
								fromList: [true],
							},
						},
						options: noteNoteFields,
					},
				],
			},
		],
	},
];

export const resPartnerDescription: INodeProperties[] = [
	{
		displayName: 'Fields To Include',
		name: 'fieldsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Choose fields to be returned',
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['res.partner'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields To Be Returnedd',
				name: 'fields',
				values: [
					{
						displayName: 'Choose From List',
						name: 'fromList',
						type: 'boolean',
						default: false,
						description: 'Enter field name or choose it from list.',
					},
					{
						displayName: 'Field:',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Enter field name',
						placeholder: '',
						displayOptions: {
							show: {
								fromList: [false],
							},
						},
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						default: '',
						noDataExpression: true,
						displayOptions: {
							show: {
								fromList: [true],
							},
						},
						options: resPartnerFields,
					},
				],
			},
		],
	},
];

export const calendarEventDescription: INodeProperties[] = [
	{
		displayName: 'Fields To Include',
		name: 'fieldsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Choose fields to be returned',
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['calendar.event'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields To Be Returnedd',
				name: 'fields',
				values: [
					{
						displayName: 'Choose From List',
						name: 'fromList',
						type: 'boolean',
						default: false,
						description: 'Enter field name or choose it from list.',
					},
					{
						displayName: 'Field:',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Enter field name',
						placeholder: '',
						displayOptions: {
							show: {
								fromList: [false],
							},
						},
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						default: '',
						noDataExpression: true,
						displayOptions: {
							show: {
								fromList: [true],
							},
						},
						options: calendarEventFields,
					},
				],
			},
		],
	},
];

export const crmLeadDescription: INodeProperties[] = [
	{
		displayName: 'Fields To Include',
		name: 'fieldsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Choose fields to be returned',
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['crm.lead'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields To Be Returnedd',
				name: 'fields',
				values: [
					{
						displayName: 'Choose From List',
						name: 'fromList',
						type: 'boolean',
						default: false,
						description: 'Enter field name or choose it from list.',
					},
					{
						displayName: 'Field:',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Enter field name',
						placeholder: '',
						displayOptions: {
							show: {
								fromList: [false],
							},
						},
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						default: '',
						noDataExpression: true,
						displayOptions: {
							show: {
								fromList: [true],
							},
						},
						options: crmLeadFields,
					},
				],
			},
		],
	},
];

export const stockPickingTypeDescription: INodeProperties[] = [
	{
		displayName: 'Fields To Include',
		name: 'fieldsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Choose fields to be returned',
		placeholder: '',
		displayOptions: {
			show: {
				resource: ['stock.picking.type'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields To Be Returnedd',
				name: 'fields',
				values: [
					{
						displayName: 'Choose From List',
						name: 'fromList',
						type: 'boolean',
						default: false,
						description: 'Enter field name or choose it from list.',
					},
					{
						displayName: 'Field:',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Enter field name',
						placeholder: '',
						displayOptions: {
							show: {
								fromList: [false],
							},
						},
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'options',
						default: '',
						noDataExpression: true,
						displayOptions: {
							show: {
								fromList: [true],
							},
						},
						options: stockPickingFields,
					},
				],
			},
		],
	},
];
