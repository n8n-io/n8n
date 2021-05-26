import {
	INodeProperties,
} from 'n8n-workflow';

export const enrollmentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'enrollment',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const enrollmentFields = [
	// ----------------------------------------
	//            enrollment: create
	// ----------------------------------------
	{
		displayName: 'Course ID',
		name: 'courseId',
		description: 'ID of the course to create the enrollment for.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'enrollment',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		description: 'ID of the user to create the enrollment for.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'enrollment',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//            enrollment: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'enrollment',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'enrollment',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
] as INodeProperties[];
