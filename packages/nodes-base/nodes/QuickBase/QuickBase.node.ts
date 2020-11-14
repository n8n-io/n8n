import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	quickbaseApiRequest,
} from './GenericFunctions';

export class QuickBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Quick Base',
		name: 'quickbase',
		icon: 'file:quickbase.png',
		group: [ 'input' ],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["tableId"]}}',
		documentationUrl: 'https://developer.quickbase.com/',
		description: 'Integrate with the Quick Base RESTful API.',
		defaults: {
			name: 'Quick Base',
			color: '#73489d'
		},
		inputs: [ 'main' ],
		outputs: [ 'main' ],
		credentials: [{
			name: 'quickbase',
			required: true
		}],
		properties: [{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [{
				name: 'Delete File',
				value: 'deleteFile',
				description: 'Delete a file attachment from a Quick Base table.'
			}, {
				name: 'Delete Records',
				value: 'deleteRecords',
				description: 'Delete records from a Quick Base table.'
			}, {
				name: 'Download File',
				value: 'downloadFile',
				description: 'Download a file attachment from a Quick Base table.'
			}, {
				name: 'Run Query',
				value: 'runQuery',
				description: 'Run a query against a Quick Base table.'
			}, {
				name: 'Run Report',
				value: 'runReport',
				description: 'Run a saved report against a Quick Base table.'
			}, {
				name: 'Upsert Records',
				value: 'upsert',
				description: 'Upsert records into a Quick Base table.'
			}],
			required: true,
			default: 'upsert',
			description: 'The operation to perform.',
		},

		/* Common */
		{
			displayName: 'Table ID',
			name: 'tableId',
			type: 'string',
			default: '',
			placeholder: '',
			required: true,
			description: 'The Quick Base Table ID to operate on.',
		}, {
			displayName: 'Where',
			name: 'where',
			type: 'string',
			default: '',
			placeholder: "{'3'.EX.'0'}",
			displayOptions: {
				show: {
					operation: [
						'runQuery',
						'deleteRecords'
					]
				}
			},
			description: 'The query filter',
		},

		/* Delete/Download File */
		{
			displayName: 'Record ID',
			name: 'recordId',
			type: 'number',
			default: '',
			required: true,
			displayOptions: {
				show: {
					operation: [
						'deleteFile',
						'downloadFile'
					]
				}
			},
			typeOptions: {
				minValue: 1
			},
			description: 'Quick Base Record ID',
		}, {
			displayName: 'Field ID',
			name: 'fieldId',
			type: 'number',
			default: '',
			required: true,
			displayOptions: {
				show: {
					operation: [
						'deleteFile',
						'downloadFile'
					],
				}
			},
			typeOptions: {
				minValue: 6
			},
			description: 'Quick Base Field ID',
		}, {
			displayName: 'Version Number',
			name: 'versionNumber',
			type: 'number',
			default: 0,
			required: true,
			displayOptions: {
				show: {
					operation: [
						'deleteFile',
						'downloadFile'
					]
				}
			},
			typeOptions: {
				minValue: 0
			},
			description: 'Quick Base File Version Number',
		},

		/* Run Query */
		{
			displayName: 'Select',
			name: 'select',
			type: 'string',
			default: '',
			placeholder: '3.4.5',
			required: true,
			displayOptions: {
				show: {
					operation: [
						'runQuery'
					]
				}
			},
			description: 'Period delimited list of field ids',
		},

		/* Run Report */
		{
			displayName: 'Report ID',
			name: 'reportId',
			type: 'number',
			default: 1,
			required: true,
			displayOptions: {
				show: {
					operation: [
						'runReport'
					]
				}
			},
			typeOptions: {
				minValue: 1
			},
			description: 'Quick Base Report ID',
		},

		/* Upsert */
		{
			displayName: 'Records Data',
			name: 'data',
			type: 'string',
			default: '',
			placeholder: '[ { "6": { "value": "field value" }, ... }, ... ]',
			required: true,
			displayOptions: {
				show: {
					operation: [
						'upsert'
					]
				}
			},
			description: 'Record data array',
		}, {
			displayName: 'Merge Field ID',
			name: 'mergeFieldId',
			type: 'number',
			default: 3,
			required: true,
			displayOptions: {
				show: {
					operation: [
						'upsert'
					]
				}
			},
			typeOptions: {
				minValue: 1
			},
			description: 'The merge field id',
		}, {
			displayName: 'Fields to Return',
			name: 'fieldsToReturn',
			type: 'string',
			default: '3',
			placeholder: '3.4.5',
			required: true,
			displayOptions: {
				show: {
					operation: [
						'upsert'
					]
				}
			},
			description: 'Period delimited list of field ids',
		}]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let tableId: string;

		let body: IDataObject;
		let qs: IDataObject;
		let isJson: boolean;

		let requestMethod: string;
		let endpoint: string;
 
        for(let i = 0; i < items.length; ++i){
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			qs = {};
			isJson = true;

			operation = this.getNodeParameter('operation', i) as string;
			tableId = this.getNodeParameter('tableId', i) as string;

			if(!tableId){
				throw new Error(`Missing Table ID.`);
			}

			switch(operation){
				case 'deleteRecords':
					requestMethod = 'DELETE';
					endpoint = 'records';

					body.from = tableId;
					body.where = this.getNodeParameter('where', i) as string;
				break;
				case 'runQuery':
					requestMethod = 'POST';
					endpoint = 'records/query';

					body.from = tableId;
					body.where = this.getNodeParameter('where', i) as string;
					body.select = (this.getNodeParameter('select', i) as string).split('.').map((val) => {
						return +val;
					});
				break;
				case 'runReport':
					requestMethod = 'POST';

					const reportId = this.getNodeParameter('reportId', i) as number;

					endpoint = `reports/${reportId}/run?tableId=${tableId}`;
				break;
				case 'upsert':
					requestMethod = 'POST';
					endpoint = 'records';

					body.to = tableId;
					body.data = JSON.parse(this.getNodeParameter('data', i) as string);
					body.mergeFieldId = this.getNodeParameter('mergeFieldId', i) as number;
					body.fieldsToReturn = (this.getNodeParameter('fieldsToReturn', i) as string).split('.').map((val) => {
						return +val;
					});
				break;
				case 'deleteFile':
				case 'downloadFile':
					if(operation === 'deleteFile'){
						requestMethod = 'DELETE';
					}else{
						isJson = false;
					}

					const recordId = this.getNodeParameter('recordId', i) as number;
					const fieldId = this.getNodeParameter('fieldId', i) as number;
					const versionNumber = this.getNodeParameter('versionNumber', i) as number;

					endpoint = `files/${tableId}/${recordId}/${fieldId}/${versionNumber}`;
				break;
				default:
					throw new Error(`The operation "${operation}" is not known!`);
			}

			const responseData = await quickbaseApiRequest.call(this, requestMethod, endpoint, body, qs, isJson);

			switch(operation){
				case 'downloadFile':
					returnData.push({
						filename: responseData.headers['content-disposition'].match(/filename="(.*)"$/)[1],
						filesize: +responseData.headers['content-length'],
						data: responseData.body
					});
				break;
				default:
					returnData.push(responseData as IDataObject);
				break;
			}
		}

		return [ this.helpers.returnJsonArray(returnData) ];
	}

}
