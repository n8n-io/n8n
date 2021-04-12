import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	togglApiRequest,
} from './GenericFunctions';

import * as moment from 'moment-timezone';
import { getWorkspaces } from '../Asana/GenericFunctions';

export class Toggl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toggl',
		name: 'toggl',
		icon: 'file:toggl.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Toggl API',
		defaults: {
			name: 'Toggl',
			color: '#00FF00',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'togglApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Time Entry',
						value: 'timeEntry',
					},
				],
				default: 'timeEntry',
				required: true,
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a time entry',
					},
					{
						name: 'Start',
						value: 'start',
						description: 'Start a time entry',
					},
				],
				default: 'start',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'start',
						],
						resource: [
							'timeEntry',
						],
					},
				},
				description: 'Time entry start',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'start',
						],
						resource: [
							'timeEntry',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Time entry tags. Multiple ones can be separated by comma.',
					},
					{
						displayName: 'Project ID',
						name: 'projectId',
						type: 'string',
						default: '',
						description: 'Project ID of the time entry.',
					},
					{
						displayName: 'Start Time',
						name: 'startTime',
						type: 'dateTime',
						default: '',
						description: 'Starting time of the time entry.',
					},

				],
			},
			//here
			//https://github.com/toggl/toggl_api_docs/blob/master/chapters/time_entries.md#time-entries
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'timeEntry',
						],
					},
				},
				description: 'Time entry creation',
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				default: {},
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'timeEntry',
						],
					},
				},
				description: 'Workspace ID',
			},
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'timeEntry',
						],
					},
				},
				description: 'Start time.',
			},

			{
				displayName: 'Duration (sec)',
				name: 'duration',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'timeEntry',
						],
					},
				},
				description: 'Time entry duration in seconds.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				//GET https://api.track.toggl.com/api/v8/workspaces Get data about all the workspaces where the token owner belongs to.
				const workspaces = await togglApiRequest.call(this, 'GET', '/workspaces');
				for (const workspace of workspaces) {
					returnData.push({
						name: workspace.name,
						value: workspace.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			//POST https://api.track.toggl.com/api/v8/time_entries/start
			//{"time_entry":{"description":"Meeting with possible clients","tags":["billed"],"pid":123,"created_with":"curl"}}' \

			if (resource === 'timeEntry') {
				if (operation === 'start') {
					const description = this.getNodeParameter('description', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						time_entry: {
							description,
							created_with: 'n8n',
						},
					};

					if (additionalFields.projectId) {
						//@ts-ignore
						body.time_entry.pid = additionalFields.projectId;
					}

					if (additionalFields.tags) {
						//@ts-ignore
						body.time_entry.tags = (additionalFields.tags as string).split(',');
					}

					if (additionalFields.startTime) {
						//@ts-ignore
						body.time_entry.start = additionalFields.startTime;
					} else {
						//@ts-ignore
						body.time_entry.start = moment().utc().format();
					}

					responseData = await togglApiRequest.call(this, 'POST', '/time_entries/start', body);

					responseData = responseData.data;
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
