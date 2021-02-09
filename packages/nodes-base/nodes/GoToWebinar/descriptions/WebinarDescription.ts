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
		displayName: 'Start Time',
		name: 'startTime',
		type: 'dateTime',
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
		displayName: 'End Time',
		name: 'endTime',
		type: 'dateTime',
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
		],
	},
] as INodeProperties[];
