import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { RundeckApi } from './RundeckApi';

export class Rundeck implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Rundeck',
		name: 'rundeck',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:rundeck.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage Rundeck API',
		defaults: {
			name: 'Rundeck',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rundeckApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Job',
						value: 'job',
					},
				],
				default: 'job',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute',
						value: 'execute',
						description: 'Execute a job',
						action: 'Execute a job',
					},
					{
						name: 'Get Metadata',
						value: 'getMetadata',
						description: 'Get metadata of a job',
						action: 'Get metadata of a job',
					},
				],
				default: 'execute',
			},

			// ----------------------------------
			//         job:execute
			// ----------------------------------
			{
				displayName: 'Job ID',
				name: 'jobid',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['execute'],
						resource: ['job'],
					},
				},
				default: '',
				placeholder: 'Rundeck Job ID',
				required: true,
				description: 'The job ID to execute',
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
						operation: ['execute'],
						resource: ['job'],
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
			//         job:getMetadata
			// ----------------------------------
			{
				displayName: 'Job ID',
				name: 'jobid',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getMetadata'],
						resource: ['job'],
					},
				},
				default: '',
				placeholder: 'Rundeck Job ID',
				required: true,
				description: 'The job ID to get metadata off',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Input data
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;

		const operation = this.getNodeParameter('operation', 0);
		const resource = this.getNodeParameter('resource', 0);
		const rundeckApi = new RundeckApi(this);
		await rundeckApi.init();

		for (let i = 0; i < length; i++) {
			if (resource === 'job') {
				if (operation === 'execute') {
					// ----------------------------------
					//         job: execute
					// ----------------------------------
					const jobid = this.getNodeParameter('jobid', i) as string;
					const rundeckArguments = (this.getNodeParameter('arguments', i) as IDataObject)
						.arguments as IDataObject[];
					const response = await rundeckApi.executeJob(jobid, rundeckArguments);

					returnData.push(response);
				} else if (operation === 'getMetadata') {
					// ----------------------------------
					//         job: getMetadata
					// ----------------------------------
					const jobid = this.getNodeParameter('jobid', i) as string;
					const response = await rundeckApi.getJobMetadata(jobid);

					returnData.push(response);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported!`,
						{ itemIndex: i },
					);
				}
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`The resource "${resource}" is not supported!`,
					{ itemIndex: i },
				);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
