import {
	INodeProperties,
} from 'n8n-workflow';
import { resource } from '../../Contentful/AssetDescription';

export const taskListOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task list',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task list',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get All a task list',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task list',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const taskListFields = [

/* -------------------------------------------------------------------------- */
/*                                 taskList:create                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'taskList',
				],
			},
		},
		required: true,
		default: '',
		description: 'Task list display name.',
	},
/* -------------------------------------------------------------------------- */
/*                                 taskList:get/delete/update                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task List ID',
		name: 'taskListId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
					'delete',
					'update',
				],
				resource: [
					'taskList',
				],
			},
		},
		required: true,
		default: '',
		description: 'Task List ID',
	},
/* -------------------------------------------------------------------------- */
/*                                 taskList:getAll                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'taskList',
				],
				operation: [
					'getAll',
				],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
/* -------------------------------------------------------------------------- */
/*                                 taskList:update                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'taskList',
				],
			},
		},
		required: true,
		default: '',
		description: 'Task list display name.',
	},
] as INodeProperties[];
