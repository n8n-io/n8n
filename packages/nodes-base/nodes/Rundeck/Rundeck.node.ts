import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { Parser } from 'xml2js';
import { RundeckApi, RundeckCredentials } from "./RundeckApi";

export class Rundeck implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Rundeck',
		name: 'rundeck',
		icon: 'file:rundeck.png',
		group: ['transform'],
		version: 1,
		description: 'Manage Rundeck API',
		defaults: {
			name: 'Rundeck',
			color: '#F73F39',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'rundeck',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Execute Job',
						value: 'executeJob',
						description: 'Executes Job.',
					},
				],
				default: 'executeJob',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         JobId
			// ----------------------------------
			{
				displayName: 'Job Id',
				name: 'jobid',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'executeJob'
						],
					},
				},
				default: '',
				placeholder: 'Rundeck Job Id',
				required: true,
				description: 'The job Id to execute.',
			},

			// ----------------------------------
			//         Arguments
			// ----------------------------------
			{
				displayName: 'Arguments',
				name: 'arguments',
				placeholder: 'Arguments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: [
							'executeJob'
						],
					},
				},
				default: {},
				options: [
					{
						name: 'arguments',
						displayName: 'Add argument',
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
						]
					},
				],
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		// Input data
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		
		const credentials = this.getCredentials('rundeck');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const rundeckCredentials: RundeckCredentials = {
			url: credentials.url as string,
			apiVersion: credentials.apiVersion as number,
			token: credentials.token as string
		};

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (operation === 'executeJob') {
				// ----------------------------------
				//         executeJob
				// ----------------------------------
				const rundeckApi = new RundeckApi(rundeckCredentials);
				const jobid = this.getNodeParameter('jobid', i) as string;
				const rundeckArguments = (this.getNodeParameter('arguments', i) as IDataObject).arguments as IDataObject[];
				let response;
	
				try {
	
					response = await rundeckApi.executeJob(jobid, rundeckArguments);
	
					const parser = new Parser({
						mergeAttrs: true,
						explicitArray: false,
					});
	
					// @ts-ignore
					const json = await parser.parseStringPromise(response);
					returnData.push({ json });
	
				} catch(error) {
					if(error.response && error.response.data && error.response.status) {
						throw Error(`status: ${error.response.status}, response: ${(error.response.data).replace('\n', '')}`);
					} else {
						throw error;
					}
				}
	
			} else {
				throw new Error(`The operation "${operation}" is not supported!`);
			}
		}
		
		return [this.helpers.returnJsonArray(returnData)];
	
	}
}
