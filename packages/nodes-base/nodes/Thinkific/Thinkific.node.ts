import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { ThinkficApi } from './ThinkficApi';

export class Thinkfic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Thinkfic',
		name: 'thinkfic',
		icon: 'file:thinkfic.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage Thinkfic API',
		defaults: {
			name: 'Thinkfic',
			color: '#F73F39',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'thinkficApi',
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
						name: 'Users',
						value: 'users',
					},
				],
				default: 'users',
				description: 'Users operations',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'Retrieve a list of users',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new user',
					},
				],
				default: 'execute',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         users:list
			// ----------------------------------
			{
				displayName: 'Job Id',
				name: 'jobid',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'execute',
						],
						resource: [
							'job',
						],
					},
				},
				default: '',
				placeholder: 'Rundeck Job Id',
				required: true,
				description: 'The job Id to execute.',
			},
			{
				displayName: 'Arguments',
				name: 'arguments',
				placeholder: 'Add Argument',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: [
							'execute',
						],
						resource: [
							'job',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'arguments',
						displayName: 'Arguments',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},


			// ----------------------------------
			//         users:create
			// ----------------------------------
			{
				displayName: 'Job Id',
				name: 'jobid',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'getMetadata',
						],
						resource: [
							'job',
						],
					},
				},
				default: '',
				placeholder: 'Rundeck Job Id',
				required: true,
				description: 'The job Id to get metadata off.',
			},
		],

	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		// Input data
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;

		for (let i = 0; i < length; i++) {
			const thinkficApi = new ThinkficApi(this);

			if (resource === 'users') {
				if (operation === 'execute') {
					// ----------------------------------
					//         job: execute
					// ----------------------------------
					const jobid = this.getNodeParameter('jobid', i) as string;
					const thinkficArguments = (this.getNodeParameter('arguments', i) as IDataObject).arguments as IDataObject[];
					const response = await thinkficApi.executeJob(jobid, thinkficArguments);

					returnData.push(response);
				} else if (operation === 'getMetadata') {
					// ----------------------------------
					//         job: getMetadata
					// ----------------------------------
					const jobid = this.getNodeParameter('jobid', i) as string;
					const response = await thinkficApi.getJobMetadata(jobid);

					returnData.push(response);
				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
