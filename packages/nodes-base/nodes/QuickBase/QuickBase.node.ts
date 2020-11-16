import {
	IExecuteFunctions, ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	quickbaseApiRequest, quickbaseApiRequestFetchAll,
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
			type: 'options',
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
				loadOptionsMethod: 'getTableFieldsFiles',
				loadOptionsDependsOn: [
					'tableId',
				],
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
		{
			displayName: 'Binary Property',
			displayOptions: {
				show: {
					operation: [
						'downloadFile',
					],
				},
			},
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description: 'Object property name which holds binary data.',
			required: true,
		},

		/* Run Report - Report ID should come before top/skip/fetchAll */
		{
			displayName: 'Report ID',
			name: 'reportId',
			type: 'options',
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
				loadOptionsMethod: 'getTableReports',
				loadOptionsDependsOn: [
					'tableId',
				],
			},
			description: 'Quick Base Report ID',
		},

		/* Run Query */
		{
			displayName: 'Select',
			name: 'select',
			type: 'multiOptions',
			default: [],
			displayOptions: {
				show: {
					operation: [
						'runQuery'
					]
				}
			},
			typeOptions: {
				loadOptionsMethod: 'getTableFields',
				loadOptionsDependsOn: [
					'tableId',
				],
			},
			description: 'Specify an array of field ids that will return data for any updates or added record. Omitting this value will return the table default fields',
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
					type: 'options',
					default: 1,
					typeOptions: {
						loadOptionsMethod: 'getTableFields',
						loadOptionsDependsOn: [
							'tableId',
						],
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
					type: 'options',
					default: 1,
					typeOptions: {
						loadOptionsMethod: 'getTableFields',
						loadOptionsDependsOn: [
							'tableId',
						],
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
			type: 'options',
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
				loadOptionsMethod: 'getTableFieldsUnique',
				loadOptionsDependsOn: [
					'tableId',
				],
			},
			description: 'The merge field id',
		}, {
			displayName: 'Fields to Return',
			name: 'fieldsToReturn',
			type: 'multiOptions',
			default: [3],
			required: true,
			displayOptions: {
				show: {
					operation: [
						'upsert'
					]
				}
			},
			typeOptions: {
				loadOptionsMethod: 'getTableFields',
				loadOptionsDependsOn: [
					'tableId',
				],
			},
			description: 'Array of field ids to return with data from the upsert',
		},

		{
			displayName: 'Simplified',
			name: 'simplified',
			type: 'boolean',
			default: true,
			displayOptions: {
				show: {
					operation: [
						'runReport',
						'runQuery',
						'upsert',
					],
				},
			},
			description: 'Remove auxiliary from the returned object and split returned data into individual objects for n8n to operate on',
		}]
	};

	methods = {
		loadOptions: {
			async getTableFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tableId = this.getCurrentNodeParameter('tableId') as string;

				const fields: {
					id: number;
					label: string;
				}[] = await quickbaseApiRequest.call(this, {
					method: 'GET',
					endpoint: 'fields',
					query: { tableId }
				});

				return fields.map((field) => {
					return {
						name: field.label,
						value: field.id
					}
				});
			},
			async getTableFieldsFiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tableId = this.getCurrentNodeParameter('tableId') as string;

				const fields: {
					id: number;
					label: string;
					fieldType: string;
				}[] = await quickbaseApiRequest.call(this, {
					method: 'GET',
					endpoint: 'fields',
					query: { tableId }
				});

				return fields.filter((field) => {
					return field.fieldType === 'file';
				}).map((field) => {
					return {
						name: field.label,
						value: field.id
					}
				});
			},
			async getTableFieldsUnique(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tableId = this.getCurrentNodeParameter('tableId') as string;

				const fields: {
					id: number;
					label: string;
					unique: boolean;
				}[] = await quickbaseApiRequest.call(this, {
					method: 'GET',
					endpoint: 'fields',
					query: { tableId }
				});

				return fields.filter((field) => {
					return field.unique === true;
				}).map((field) => {
					return {
						name: field.label,
						value: field.id
					}
				});
			},
			async getTableReports(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const tableId = this.getCurrentNodeParameter('tableId') as string;

				const reports: {
					id: number;
					name: string;
				}[] = await quickbaseApiRequest.call(this, {
					method: 'GET',
					endpoint: 'reports',
					query: { tableId }
				});

				return reports.map((report) => {
					return {
						name: report.name,
						value: report.id
					}
				});
			}
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let tableId: string;

		let body: IDataObject;
		let qs: IDataObject;
		let isJson: boolean;

		let requestMethod: 'GET' | 'DELETE' | 'POST';
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
					body.select = this.getNodeParameter('select', i) as number[];

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
					body.fieldsToReturn = (this.getNodeParameter('fieldsToReturn', i) as number[]);
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

			const options = {
				method: requestMethod,
				endpoint,
				body,
				query: qs,
				isJson
			};

			let responseData: any;

			if(fetchAll){
				responseData = await quickbaseApiRequestFetchAll.call(this, options);
			}else{
				try {
					responseData = await quickbaseApiRequest.call(this, options);
				}catch(error){
					switch(operation){
						case 'downloadFile':
							if(error.message.match(/bad request/i)){
								throw new Error('File not found');
							}

							throw error;
						default:
							throw error;
					}
				}
			}

			switch(operation){
				case 'downloadFile':
					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;
					const filename = responseData.headers['content-disposition'].match(/filename="(.*)"$/)[1];
					const buffer = Buffer.from(responseData.body, 'base64');

					returnData.push({
						_prepared: true,
						json: {
							filename: filename,
							filesize: +responseData.headers['content-length']
						},
						binary: {
							[dataPropertyNameDownload]: await this.helpers.prepareBinaryData(buffer, filename)
						}
					});
				break;
				case 'runQuery':
				case 'runReport':
				case 'upsert':
					const simplified = this.getNodeParameter('simplified', i) as boolean;

					if(simplified){
						responseData.data.forEach((record: IDataObject) => {
							returnData.push(record);
						});
					}else{
						returnData.push(responseData);
					}
				break;
				default:
					returnData.push(responseData);
				break;
			}
		}

		return [ returnData.map((data: any) => {
			if(data._prepared){
				return data;
			}

			return {
				json: data
			};
		}) ];
	}

}
