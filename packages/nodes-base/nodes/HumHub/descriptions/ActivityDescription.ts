import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const activityOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all global activity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get activity by id',
			},
			{
				name: 'Get All By Container',
				value: 'getAllByContainer',
				description: 'Get all activities by container',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const  activityFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 activity:getAll                              */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('activity'),

	/* -------------------------------------------------------------------------- */
	/*                                 activity:get                     	         */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the activity.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 activity:getAllByContainer                 */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'Container ID',
		name: 'containerId',
		type: 'number',
        typeOptions: {
            numberStepSize: 1,
        },
		displayOptions: {
			show: {
				resource: [
					'activity',
				],
				operation: [
					'getAllByContainer',
				],
			},
		},
		default: '',
		description: 'The ID of the container.',
	},
	...getPagingParameters('activity', 'getAllByContainer'),

] as INodeProperties[];
