import {
	INodeProperties,
} from 'n8n-workflow';
import { timezones } from './constants';

export const webinarOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
			},
		},
	},
] as INodeProperties[];

export const webinarFields = [
	// ----------------------------------
	//     webinar: shared fields
	// ----------------------------------
	{
		displayName: 'Webinar Key',
		name: 'webinarKey',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'delete',
					'get',
					'update',
				],
			},
		},
	},
	// ----------------------------------
	//         webinar: create
	// ----------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		description: '',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Times',
		name: 'times',
		type: 'fixedCollection',
		required: true,
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Times Properties',
				name: 'timesProperties',
				values: [
					{
						displayName: 'Start Time',
						name: 'startTime',
						type: 'dateTime',
						required: true,
						default: '',
					},
					{
						displayName: 'End Time',
						name: 'endTime',
						type: 'dateTime',
						required: true,
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
				description: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'ExperienceType',
				name: 'experienceType',
				type: 'options',
				required: false,
				default: '',
				description: '',
				options: [
					{
						name: 'Single Session',
						value: 'single_session',
					},
					{
						name: 'Series',
						value: 'series',
					},
					{
						name: 'Sequence',
						value: 'sequence',
					},
				],
			},
			{
				displayName: 'Is On-Demand',
				name: 'isOnDemand',
				type: 'boolean',
				required: false,
				default: false,
				description: '',
			},
			{
				displayName: 'Is Password Protected',
				name: 'isPasswordProtected',
				type: 'boolean',
				required: false,
				default: false,
				description: '',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'options',
				required: true,
				default: '',
				placeholder: '2020-12-11T09:00:00Z',
				description: '',
				options: timezones.map(tz => ({ name: tz.replace(/_/g, ' '), value: tz })),
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Webinar Type',
				name: 'webinarType',
				type: 'options',
				required: false,
				default: '',
				description: '',
				options: [
					{
						name: 'Single Session',
						value: 'single_session',
					},
					{
						name: 'Series',
						value: 'series',
					},
					{
						name: 'Sequence',
						value: 'sequence',
					},
				],
			},
		],
	},
	// ----------------------------------
	//         webinar: delete
	// ----------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'delete',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Send Cancellation E-mails',
				name: 'sendCancellationEmails',
				type: 'boolean',
				required: false,
				default: false,
				description: '',
			},
		],
	},
	// ----------------------------------
	//         webinar: update
	// ----------------------------------
	{
		displayName: 'Notify Participants',
		name: 'notifyParticipants',
		type: 'boolean',
		required: true,
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'webinar',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
				description: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'ExperienceType',
				name: 'experienceType',
				type: 'options',
				required: false,
				default: '',
				description: '',
				options: [
					{
						name: 'Single Session',
						value: 'single_session',
					},
					{
						name: 'Series',
						value: 'series',
					},
					{
						name: 'Sequence',
						value: 'sequence',
					},
				],
			},
			{
				displayName: 'Is On-Demand',
				name: 'isOnDemand',
				type: 'boolean',
				required: false,
				default: false,
				description: '',
			},
			{
				displayName: 'Is Password Protected',
				name: 'isPasswordProtected',
				type: 'boolean',
				required: false,
				default: false,
				description: '',
			},
			{
				displayName: 'Times',
				name: 'times',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Times Properties',
						name: 'timesProperties',
						values: [
							{
								displayName: 'Start Time',
								name: 'startTime',
								type: 'dateTime',
								required: true,
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'endTime',
								type: 'dateTime',
								required: true,
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: false,
				default: '',
				description: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'options',
				required: true,
				default: '',
				placeholder: '2020-12-11T09:00:00Z',
				description: '',
				options: timezones.map(tz => ({ name: tz.replace(/_/g, ' '), value: tz })),
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Webinar Type',
				name: 'webinarType',
				type: 'options',
				required: false,
				default: '',
				description: '',
				options: [
					{
						name: 'Single Session',
						value: 'single_session',
					},
					{
						name: 'Series',
						value: 'series',
					},
					{
						name: 'Sequence',
						value: 'sequence',
					},
				],
			},
		],
	},
] as INodeProperties[];
