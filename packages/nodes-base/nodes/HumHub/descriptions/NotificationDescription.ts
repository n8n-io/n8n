import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getPagingParameters
} from '../GenericFunctions';

export const notificationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'notification',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Find all user notifications',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get notification by id',
			},
			{
				name: 'Get Unseen',
				value: 'getUnseen',
				description: 'Find unseen user notifications',
			},
			{
				name: 'Mark As Seen',
				value: 'markAsSeen',
				description: 'Mark all notifications as seen',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const notificationFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 notification:getAll              		  */
	/* -------------------------------------------------------------------------- */

    {
		displayName: 'Exclude Filters',
		name: 'excludeFilters',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: [
					'notification',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: [],
		description: 'Filters to exclude notifications from result.',
		options: [
			{
				name: 'Admin',
				value: 'admin',
			},
			{
				name: 'Calendar',
				value: 'calendar',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'Task Reminder',
				value: 'task_reminder',
			},
			{
				name: 'Comments',
				value: 'comments',
			},
			{
				name: 'Content Created',
				value: 'content_created',
			},
			{
				name: 'Like',
				value: 'like',
			},
			{
				name: 'Space Member',
				value: 'space_member',
			},
			{
				name: 'Followed',
				value: 'followed',
			},
			{
				name: 'Mentioned',
				value: 'mentioned',
			},
		],
	},
	...getPagingParameters('notification'),

	/* -------------------------------------------------------------------------- */
	/*                                 notification:get                           */
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
					'notification',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The ID of the notification.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 notification:getUnseen                     */
	/* -------------------------------------------------------------------------- */

	...getPagingParameters('notification', 'getUnseen'),

	/* -------------------------------------------------------------------------- */
	/*                                 notification:markAsSeen                    */
	/* -------------------------------------------------------------------------- */

	// no params for that endpoint

] as INodeProperties[];
