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
			default: 1,
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
			default: 6,
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

		/* Run Report - Report ID should come before top/skip/fetchAll */
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
		}, {
			displayName: 'Fetch All Records',
			name: 'fetchAll',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					operation: [
						'runQuery',
						'runReport'
					]
				}
			},
			description: 'Cycle through Quick Base\'s pagination to retreive all records'
		}, {
			displayName: 'Top',
			name: 'top',
			type: 'number',
			default: 100,
			typeOptions: {
				minValue: 1
			},
			displayOptions: {
				show: {
					operation: [
						'runQuery',
						'runReport'
					],
					fetchAll: [
						false
					]
				}
			},
			description: 'The maximum number of records to return'
		}, {
			displayName: 'Skip',
			name: 'skip',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0
			},
			displayOptions: {
				show: {
					operation: [
						'runQuery',
						'runReport'
					],
					fetchAll: [
						false
					]
				}
			},
			description: 'The number of records to skip'
		},  {
			displayName: 'Use App Local Time',
			name: 'compareWithAppLocalTime',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					operation: [
						'runQuery'
					]
				}
			},
			description: 'Whether to run the query against the Quick Base application\'s local time as opposed to UTC (UTC or false is default)'
		}, {
			displayName: 'Sort By',
			name: 'sortByUI',
			type: 'fixedCollection',
			default: [],
			displayOptions: {
				show: {
					operation: [
						'runQuery'
					]
				}
			},
			typeOptions: {
				multipleValues: true,
				multipleValueButtonText: 'Add Sort By'
			},
			description: 'Sort the query in the order of the given field ids',
			placeholder: 'Add Sort By',
			options: [{
				name: 'sortBy',
				displayName: 'Sort By',
				values: [{
					displayName: 'Field ID',
					name: 'fieldId',
					type: 'number',
					default: 1,
					typeOptions: {
						minValue: 1
					},
					description: 'Field ID to sort by'
				}, {
					displayName: 'Order',
					name: 'order',
					type: 'options',
					default: 'DESC',
					options: [{
						name: 'Ascending',
						value: 'ASC'
					}, {
						name: 'Descending',
						value: 'DESC'
					}],
					description: 'Direction of sort'
				}]
			}]
		},{
			displayName: 'Group By',
			name: 'groupByUI',
			type: 'fixedCollection',
			default: [],
			displayOptions: {
				show: {
					operation: [
						'runQuery'
					]
				}
			},
			typeOptions: {
				multipleValues: true,
				multipleValueButtonText: 'Add Group By'
			},
			description: 'Group the query in the order of the given field ids',
			placeholder: 'Add Group By',
			options: [{
				name: 'groupBy',
				displayName: 'Group By',
				values: [{
					displayName: 'Field ID',
					name: 'fieldId',
					type: 'number',
					default: 1,
					typeOptions: {
						minValue: 1
					},
					description: 'Field ID to group by'
				}, {
					displayName: 'Grouping',
					name: 'grouping',
					type: 'options',
					default: 'equal-values',
					options: [{
						name: 'Ascending',
						value: 'ASC'
					}, {
						name: 'Descending',
						value: 'DESC'
					}, {
						name: 'Equal Values',
						value: 'equal-values'
					}],
					description: 'Grouping type'
				}]
			}]
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

		let fetchAll: boolean | 'qs';
 
        for(let i = 0; i < items.length; ++i){
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			qs = {};
			isJson = true;
			fetchAll = false;

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

					const sortBy = (this.getNodeParameter('sortByUI', i) as {
						sortBy: {
							fieldId: number;
							order: 'ASC' | 'DESC';
						}[]
					}).sortBy;

					if(sortBy.length > 0){
						body.sortBy = sortBy;
					}

					const groupBy = (this.getNodeParameter('groupByUI', i) as {
						groupBy: {
							fieldId: number;
							grouping: 'ASC' | 'DESC' | 'equal-values';
						}[]
					}).groupBy;

					if(groupBy.length > 0){
						body.groupBy = groupBy;
					}

					const compareWithAppLocalTime = this.getNodeParameter('compareWithAppLocalTime', i) as boolean;

					fetchAll = this.getNodeParameter('fetchAll', i) as boolean

					const options: {
						top?: number;
						skip?: number;
						compareWithAppLocalTime?: boolean;
					} = {};

					if(!fetchAll){
						const top = this.getNodeParameter('top', i) as number;
						const skip = this.getNodeParameter('skip', i) as number;

						if(top !== undefined){
							options.top = top;
						}

						if(skip !== undefined){
							options.skip = skip;
						}
					}

					if(compareWithAppLocalTime !== undefined){
						options.compareWithAppLocalTime = compareWithAppLocalTime;
					}

					body.options = options;
				break;
				case 'runReport':
					requestMethod = 'POST';

					const reportId = this.getNodeParameter('reportId', i) as number;

					fetchAll = this.getNodeParameter('fetchAll', i) as boolean

					if(!fetchAll){
						const top = this.getNodeParameter('top', i) as number;
						const skip = this.getNodeParameter('skip', i) as number;

						if(top !== undefined){
							qs.top = top;
						}

						if(skip !== undefined){
							qs.skip = skip;
						}

						fetchAll = 'qs';
					}

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

			const responseData = await quickbaseApiRequest.call(this, requestMethod, endpoint, body, qs, isJson, fetchAll);

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
