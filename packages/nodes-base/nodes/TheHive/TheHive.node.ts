import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeParameters,
	ILoadOptionsFunctions,
	INodePropertyOptions
} from 'n8n-workflow';
import { alertOperations, alertFields } from './descriptions/AlertDescription';
import { observableOperations, observableFields } from './descriptions/ObservableDescription';
import { caseOperations, caseFields } from './descriptions/CaseDescription';
import { taskOperations, taskFields } from './descriptions/TaskDescription';
import { logOperations, logFields } from './descriptions/LogDescription';
import { createReadStream, } from 'fs';
import { Buffer } from 'buffer';
import moment = require('moment');
import {
	IQueryObject,
	Parent,
	Id,
	Eq,
	And,
	Between,
	In,
	ContainsString
} from './QueryFunctions'
import {
	getAll,
	getOneById,
	create,
	update,
	search,
	theHiveApiRequest,
} from './GenericFunctions';
// Helpers functions
function mapResource(resource: string): string {
	switch (resource) {
		case 'alert':
			return 'alert'
			break;
		case 'case':
			return 'case'
			break;
		case 'observable':
			return 'case_artifact'
			break;
		case 'task':
			return 'case_task'
			break;
		case 'log':
			return 'case_task_log'
			break;
		default:
			return '';
			break;
	}
}
function splitTags(tags: string): string[] {
	return tags.split(',').filter(tag => tag != ' ' && tag)
}
function prepareOptional(optionals: IDataObject): IDataObject {
	let response: IDataObject = {};
	for (let key in optionals) {
		if (optionals[key]!== undefined && optionals[key]!==null && optionals[key]!=='') {
			if (moment(optionals[key] as string, moment.ISO_8601).isValid()) {
				response[key] = Date.parse(optionals[key] as string);
			} else if (key === 'artifacts') {
				response[key] = JSON.parse(optionals[key] as string);
			} else if (key === 'tags') {
				response[key] = splitTags(optionals[key] as string);
			} else {
				response[key] = optionals[key]
			}
		}
	}
	return response
}
function prepareSortQuery(sort: string, body: { 'query': {}[] }) {
	if (sort) {
		let field = sort.substring(1);
		let value = sort.charAt(0) == '+' ? 'asc' : 'desc';
		let sortOption: IDataObject = {}; sortOption[field] = value;
		body['query'].push(
			{
				'_name': 'sort',
				'_fields': [
					sortOption
				]
			}
		)
	}
}
function prepareRangeQuery(range: string, body: { 'query': {}[] }) {
	if (range && range != 'all') {
		body['query'].push(
			{
				'_name': 'page',
				'from': parseInt(range.split('-')[0]),
				'to': parseInt(range.split('-')[1])
			}
		)
	}
}
export class TheHive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TheHive',
		name: 'theHive',
		icon: 'file:thehive.png',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
		version: 1,
		description: 'Consume TheHive APIs',
		defaults: {
			name: 'TheHive',
			color: '#f3d02f',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'theHiveApi',
				required: true,
			}
		],
		properties: [
			{
				default: 'alert',
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{ name: 'Alert', value: 'alert', description: '' },
					{ name: 'Observable', value: 'observable', description: '' },
					{ name: 'Case', value: 'case', description: '' },
					{ name: 'Task', value: 'task', description: '' },
					{ name: 'Log', value: 'log', description: '' },
				]
			},
			// Alert 
			...alertOperations,
			...alertFields,
			// Observable
			...observableOperations,
			...observableFields,
			// Case 
			...caseOperations,
			...caseFields,
			// Task 
			...taskOperations,
			...taskFields,
			// Log 
			...logOperations,
			...logFields,
			{
				displayName: 'Explode array',
				name: 'explode',
				type: 'boolean',
				required: true,
				default: true,
				description: 'Turn result array into output items',
				displayOptions: {
					show: {
						operation: ['list', 'search']
					}
				}
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				placeholder: 'all or X-Y',
				required: false,
				default: '',
				displayOptions: {
					show: {
						operation: ['list', 'search']
					}
				}
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '±Attribut, exp +status',
				required: false,
				default: '',
				displayOptions: {
					show: {
						operation: ['list', 'search']
					}
				}
			}
		]
	};
	methods = {
		loadOptions: {
			async loadResponders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the analyzers from instance 
				let resource = mapResource(this.getNodeParameter('resource') as string);
				let resourceId = this.getNodeParameter('id');
				let endpoint = `connector/cortex/responder/${resource}/${resourceId}`;
				let requestResult = await getAll.call(this, endpoint, {}, {});
				// parse them into options
				const returnData: INodePropertyOptions[] = [];
				let responder: any;
				for (responder of requestResult) {
					returnData.push({
						name: responder.name as string,
						value: responder.id,//`${responder.id as string}::${responder.name as string}`,
						description: responder.description as string,
					});
				}
				return returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
			},
			async loadAnalyzers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// request the analyzers from instance 
				let dataType = this.getNodeParameter('dataType') as string;
				let endpoint = `connector/cortex/analyzer/type/${dataType}`;
				let requestResult = await getAll.call(this, endpoint, {}, {});
				// parse them into options
				const returnData: INodePropertyOptions[] = [];
				let analyzer: any;
				for (analyzer of requestResult) {
					for (let cortexId of analyzer.cortexIds) {
						returnData.push({
							name: `[${cortexId}] ${analyzer.name}`,
							value: `${analyzer.id as string}::${cortexId as string}`,
							description: analyzer.description as string,
						});
					}
				}
				return returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
			},
			async loadObservableOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				// if v1 is not used we remove 'count' option
				let apiVersion = this.getCredentials('theHiveApi')?.apiVersion;
				
				let options= [
				{name:'List',value:'list',description:'List observables'},
				{name: 'Fetch One', value: 'fetch', description: 'Get a single observable' },
				{name:'Create',value:'create',description:'Create observable'},
				{name:'Update',value:'update',description:'Update observable'},
				{name:'Search',value:'search',description:'Search observables'},
				...(apiVersion=='v1')?[{name:'Count',value:'count',description:'Count observables'}]:[],
				{name:'Execute a responder',value:'execute_responder',description:'Execute a responder on selected observable'},
				{name:'Execute an analyzer',value:'execute_analyzer',description:'Execute an responder on selected observable'},
				]
				return options;
			},
			async loadTaskOptions(this:ILoadOptionsFunctions): Promise<INodePropertyOptions[]>{
				let apiVersion = this.getCredentials('theHiveApi')?.apiVersion;
				let options =[
				{name:'List',value:'list',description:'List tasks'},
				{name:'Fetch One', value: 'fetch', description: 'Get a single task' },
				{name:'Create',value:'create',description:'Create a task'},
				{name:'Update',value:'update',description:'Update a task'},
				{name:'Search',value:'search',description:'Search tasks'},
				...(apiVersion=='v1')?[{name:'Count',value:'count',description:'Count tasks'}]:[],
				{name:'Execute a responder', value: 'execute_responder', description: 'Execute a responder on the specified task' },
				]
				return options
			},
			async loadAlertOptions(this:ILoadOptionsFunctions):Promise<INodePropertyOptions[]>{
				let apiVersion= this.getCredentials('theHiveApi')?.apiVersion;
				let options=[
					{ name: 'List', value: 'list', description: 'List alerts' },
					{ name: 'Fetch One', value: 'fetch', description: 'Get a single alert' },
					{ name: 'Create', value: 'create', description: 'Create alert' },
					{ name: 'Update', value: 'update', description: 'Update alert' },
					{ name: 'Search', value: 'search', description: 'Search alert' },
					...(apiVersion=='v1')?[{ name: 'Count', value: 'count', description: 'Count alert' }]:[],
					{ name: 'Merge', value: 'merge', description: 'Merge alert into an existing case' },
					{ name: 'Promote', value: 'promote', description: 'Promote an alert into a case' },
					{ name: 'Execute a responder', value: 'execute_responder', description: 'Execute a responder on the specified alert' },
		
				]
				return options
			},
			async loadCaseOptions(this:ILoadOptionsFunctions):Promise<INodePropertyOptions[]>{
				let apiVersion= this.getCredentials('theHiveApi')?.apiVersion;
				let options=[
					{ name: 'List', value: 'list', description: 'List cases' },
					{ name: 'Fetch One', value: 'fetch', description: 'Get a single case' },
					{ name: 'Create', value: 'create', description: 'Create a case' },
					{ name: 'Update', value: 'update', description: 'Update a case' },
					{ name: 'Search', value: 'search', description: 'Search a case' },
					...(apiVersion=='v1')?[{ name: 'Count', value: 'count', description: 'Count a case' }]:[],
					{ name: 'Execute a responder', value: 'execute_responder', description: 'Execute a responder on the specified case' },
		
				]
				return options
			}
		}
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();
		let apiVersion = this.getCredentials('theHiveApi')?.apiVersion;
		let outputData: INodeExecutionData[] = [];;
		let endpoint: string;
		let range: string;
		let sort: string;
		let response: any;
		let resource: string;
		let operation: string;
		let body: any;
		let query: any;
		for (var i = 0; i < items.length; i++) {
			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;
			body = {};
			query = {};
			switch (resource) {
				case 'alert':
					switch (operation) {
						case 'list':
							if (apiVersion === 'v1') {
								endpoint = 'v1/query';
								range = this.getNodeParameter('range', i, 'all') as string || 'all';
								sort = this.getNodeParameter('sort', i) as string;
								body = {
									'query': [
										{
											'_name': 'listAlert'
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'alerts' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								response = await getAll.call(this, resource, body, query);
							}
							let explode = this.getNodeParameter('explode', i) as boolean;
							if (explode) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'fetch':
							let fetchAlertId = this.getNodeParameter('id', i);
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								body = {
									"query": [
										{
											"_name": "getAlert",
											"idOrName": fetchAlertId
										}
									]
								}
								query = { name: `get-alert-${fetchAlertId}` }
								response = await create.call(this, endpoint, body, query);
								response = response[0];
							} else {
								response = await getOneById.call(this, `${resource}/${fetchAlertId}`, body, {});
							}
							outputData.push({ json: response });
							break;
						case 'create':
							body = {
								title: this.getNodeParameter('title', i),
								description: this.getNodeParameter('description', i),
								severity: this.getNodeParameter('severity', i),
								date: Date.parse(this.getNodeParameter('date', i) as string),
								tags: splitTags(this.getNodeParameter('tags', i) as string),
								tlp: this.getNodeParameter('tlp', i),
								status: this.getNodeParameter('status', i),
								type: this.getNodeParameter('type', i),
								source: this.getNodeParameter('source', i),
								sourceRef: this.getNodeParameter('sourceRef', i),
								artifacts: JSON.parse(this.getNodeParameter('artifacts', i)as string),
								follow: this.getNodeParameter('follow', i, true),
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							};
							response = await create.call(this, resource, body, {});
							outputData.push({ json: response });
							break;
						case 'update':
							let id = this.getNodeParameter('id', i);
							body = {
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							};
							response = await update.call(this, `${resource}/${id}`, body, query);
							outputData.push({ json: response });
							break;
						case 'merge':
							let merginAlertId = this.getNodeParameter('id', i);
							let caseId = this.getNodeParameter('caseId', i);
							response = await theHiveApiRequest.call(this, 'POST', `${resource}/${merginAlertId}/merge/${caseId}`, body, query, undefined, {});
							outputData.push({ json: response });
							break;
						case 'search':
							let queryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _searchQuery: IQueryObject = And();
							for (const key of Object.keys(queryAttributs)) {
								if ( key == 'tags') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										In(key, queryAttributs[key] as string[])
									)
								} else if (key == 'description' || key == 'title' ) {
									(_searchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, queryAttributs[key] as string)
									)
								} else {
									(_searchQuery['_and'] as IQueryObject[]).push(
										Eq(key, queryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								range = this.getNodeParameter('range', i, 'all') as string || 'all';
								sort = this.getNodeParameter('sort', i) as string;
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listAlert"
										},
										{
											"_name": "filter",
											"_and": _searchQuery['_and']
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'alerts' }
								response = await create.call(this, endpoint, body, query);
							} else {
								 query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								response = await search.call(this, `alert`, { query: _searchQuery }, query);
							}
							let explodeOption = this.getNodeParameter('explode', i) as boolean;
							if (explodeOption) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'count':
							let countQueryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _countSearchQuery: IQueryObject = And();
							for (const key of Object.keys(countQueryAttributs)) {
								if ( key == 'tags') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										In(key, countQueryAttributs[key] as string[])
									)
								} else if (key == 'description' || key == 'title' ) {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, countQueryAttributs[key] as string)
									)
								} else {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										Eq(key, countQueryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listAlert"
										},
										{
											"_name": "filter",
											"_and": _countSearchQuery['_and']
										},
									]
								}
								
								body['query'].push(
									{
										"_name": "count"
									}
								)
								query = { name: 'count-Alert' }
								response = await create.call(this, endpoint, body, query);
							} else {
								throw Error('Count in available only for API v1, please the version')
							}
							
							outputData.push({ json: {count:response} })
							
							break;
						case 'promote':
							let alertId = this.getNodeParameter('id', i);
							body = {
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							response = await theHiveApiRequest.call(this, 'POST', `${resource}/${alertId}/createCase`, body, query, undefined, {});
							outputData.push({ json: response });
							break;
						case 'execute_responder':
							let objectId = this.getNodeParameter('id', i);
							let responders = this.getNodeParameter('responder', i) as string[];
							for (let responderId of responders) {
								body = {
									responderId,
									objectId,
									objectType: 'alert'
								}
								response = await create.call(this, `connector/cortex/action`, body, query);
								body = {
									"query": [
										{
											"_name": "listAction"
										},
										{
											"_name": "filter",
											"_and": [
												{
													"_field": "cortexId",
													"_value": response.cortexId
												},
												{
													"_field": "objectId",
													"_value": response.objectId
												},
												{
													"_field": "startDate",
													"_value": response.startDate
												}
											]
										}
									]
								}
								query={name:'alert-actions'}
								do {
									response = await theHiveApiRequest.call(this,'POST',`v1/query`,body,query,undefined,{});
									response = response[0];
								} while (response.status=="Waiting" || response.status=="InProgress" );  
								outputData.push({ json: response });
							}
							break;
						default:
							break;
					}
					break;
				case 'observable':
					switch (operation) {
						case 'list':
							let caseid = this.getNodeParameter('caseid', i);
							range = this.getNodeParameter('range', i, 'all') as string || 'all';
							sort = this.getNodeParameter('sort', i) as string;
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								body = {
									"query": [
										{
											"_name": "getCase",
											"idOrName": caseid
										},
										{
											"_name": "observables"
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'observables' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								let searchQuery: IQueryObject = Parent("case", Id(caseid as string));
								/* body content format:
								{
									"query":{
										"_parent": { "_type": "case", "_query": { "_id": caseid } } 
									}
								}
								*/
								response = await search.call(this, `case/artifact`, { query: searchQuery }, query);
							}
							let explode = this.getNodeParameter('explode', i) as boolean;
							if (explode) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'fetch':
							let fetchObservableId = this.getNodeParameter('id', i);
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								body = {
									"query": [
										{
											"_name": "getObservable",
											"idOrName": fetchObservableId
										}
									]
								}
								query = { name: `get-observable-${fetchObservableId}` }
								response = await create.call(this, endpoint, body, query);
								response = response[0];
							} else {
								response = await getOneById.call(this, `case/artifact/${fetchObservableId}`, body, {});
							}
							outputData.push({ json: response });
							break;
						case 'create':
							let caseId = this.getNodeParameter('caseid', i);
							body = {
								dataType: this.getNodeParameter('dataType', i) as string,
								message: this.getNodeParameter('message', i) as string,
								startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
								tlp: this.getNodeParameter('tlp', i) as number,
								ioc: this.getNodeParameter('ioc', i) as boolean,
								sighted: this.getNodeParameter('sighted', i) as boolean,
								status: this.getNodeParameter('status', i) as string,
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							let options = {};
							if (this.getNodeParameter('dataType', i) === 'file') {
								let attachmentData;
								let attachmentType = this.getNodeParameter('attachmentType', i) as string;
								if (attachmentType === 'path') {
									let attachmentPath = this.getNodeParameter('attachment', i) as string;
									attachmentData = createReadStream(attachmentPath);
								} else if (attachmentType === 'binary') {
									let mimeType = this.getNodeParameter('mimeType', i) as string;
									let fileName = this.getNodeParameter('fileName', i) as string;
									let data = this.getNodeParameter('data', i) as string;
									let buff = Buffer.from(data, 'base64');
									attachmentData = {
										value: buff,
										options: {
											filename: fileName,
											contentType: mimeType
										}
									}
								}
								options = {
									'formData': {
										'attachment': attachmentData,
										'_json': JSON.stringify({
											...body
										})
									}
								}
								body = {}
							} else {
								body = {
									...body,
									data: this.getNodeParameter('data', i, null),
								}
							}
							response = await theHiveApiRequest.call(this, 'POST', `case/${caseId}/artifact`, body, query, undefined, options);
							outputData.push({ json: response });
							break;
						case 'update':
							let id = this.getNodeParameter('id', i);
							body = {
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							response = await update.call(this, `case/artifact/${id}`, body, query);
							outputData.push({ json: response });
							break;
						case 'search':
							let queryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _searchQuery: IQueryObject = And();
							for (const key of Object.keys(queryAttributs)) {
								if (key == 'dataType' || key == 'tags') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										In(key, queryAttributs[key] as string[])
									)
								} else if (key == 'description' || key == 'keywork' || key == 'message') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, queryAttributs[key] as string)
									)
								} else if (key == 'range') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										Between(
											"startDate",
											queryAttributs['range']['dateRange']['fromDate'],
											queryAttributs['range']['dateRange']['toDate']
										)
									)
								} else {
									(_searchQuery['_and'] as IQueryObject[]).push(
										Eq(key, queryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								range = this.getNodeParameter('range', i, 'all') as string || 'all';
								sort = this.getNodeParameter('sort', i) as string;
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listObservable"
										},
										{
											"_name": "filter",
											"_and": _searchQuery['_and']
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'observables' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								response = await search.call(this, `case/artifact`, { query: _searchQuery }, query);
							}
							let explodeOption = this.getNodeParameter('explode', i) as boolean;
							if (explodeOption) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'count':
							let countQueryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _countSearchQuery: IQueryObject = And();
							for (const key of Object.keys(countQueryAttributs)) {
								if (key == 'dataType' || key == 'tags') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										In(key, countQueryAttributs[key] as string[])
									)
								} else if (key == 'description' || key == 'keywork' || key == 'message') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, countQueryAttributs[key] as string)
									)
								} else if (key == 'range') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										Between(
											"startDate",
											countQueryAttributs['range']['dateRange']['fromDate'],
											countQueryAttributs['range']['dateRange']['toDate']
										)
									)
								} else {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										Eq(key, countQueryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listObservable"
										},
										{
											"_name": "filter",
											"_and": _countSearchQuery['_and']
										},
									]
								}
								
								body['query'].push(
									{
										"_name": "count"
									}
								)
								query = { name: 'count-observables' }
								response = await create.call(this, endpoint, body, query);
							} else {
								throw Error('Count in available only for API v1, please the version')
							}
							
							outputData.push({ json: {count:response} })
							
							break;
						case 'execute_responder':
							let objectId = this.getNodeParameter('id', i);
							let responders = this.getNodeParameter('responder', i) as string[];
							for (let responderId of responders) {
								body = {
									responderId,
									objectId,
									objectType: 'case_artifact'
								}
								response = await create.call(this, `connector/cortex/action`, body, query);
								body = {
									"query": [
										{
											"_name": "listAction"
										},
										{
											"_name": "filter",
											"_and": [
												{
													"_field": "cortexId",
													"_value": response.cortexId
												},
												{
													"_field": "objectId",
													"_value": response.objectId
												},
												{
													"_field": "startDate",
													"_value": response.startDate
												}
												
											]
										}
									]
								}
								query={name:'observable-actions'}
								do {
									response = await theHiveApiRequest.call(this,'POST',`v1/query`,body,query,undefined,{});
									response = response[0];
								} while (response.status=="Waiting" || response.status=="InProgress" ); 
								outputData.push({ json: response });
							}
							break;
						case 'execute_analyzer':
							let artifactId = this.getNodeParameter('id', i);
							let analyzers = (this.getNodeParameter('analyzer', i) as string[])
								.map(analyzer => {
									let ids = analyzer.split("::");
									return {
										analyzerId: ids[0],
										cortexId: ids[1]
									}
								})
							for (let analyzer of analyzers) {
								body = {
									...analyzer,
									artifactId,
								}
								// execute the analyzer
								response = await create.call(this, `connector/cortex/job`, body, query);
								let jobId = response.id
								query={name:'observable-jobs'}
								// query the job result (including the report)
								do {
									response = await theHiveApiRequest.call(this,'GET',`connector/cortex/job/${jobId}`,body,query,undefined,{});
								} while (response.status=="Waiting" || response.status=="InProgress" ); 
								outputData.push({ json: response });
							}
						default:
							break;
					}
					break;
				case 'case':
					switch (operation) {
						case 'list':
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								range = this.getNodeParameter('range', i, 'all') as string || 'all';
								sort = this.getNodeParameter('sort', i) as string
								body = {
									"query": [
										{
											"_name": "listCase"
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'cases' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								response = await getAll.call(this, resource, body, query);
							}
							let explode = this.getNodeParameter('explode', i) as boolean;
							if (explode) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'fetch':
							let fetchCaseId = this.getNodeParameter('id', i);
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								body = {
									"query": [
										{
											"_name": "getCase",
											"idOrName": fetchCaseId
										}
									]
								}
								query = { name: `get-case-${fetchCaseId}` }
								response = await create.call(this, endpoint, body, query);
								response = response[0];
							} else {
								response = await getOneById.call(this, `${resource}/${fetchCaseId}`, body, {});
							}
							outputData.push({ json: response });
							break;
						case 'create':
							body = {
								title: this.getNodeParameter('title', i),
								description: this.getNodeParameter('description', i),
								severity: this.getNodeParameter('severity', i),
								startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
								owner: this.getNodeParameter('owner', i),
								flag: this.getNodeParameter('flag', i),
								tlp: this.getNodeParameter('tlp', i),
								tags: splitTags(this.getNodeParameter('tags', i) as string),
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							response = await create.call(this, resource, body, query);
							outputData.push({ json: response });
							break;
						case 'update':
							let id = this.getNodeParameter('id', i);
							body = {
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							response = await update.call(this, `${resource}/${id}`, body, query);
							outputData.push({ json: response });
							break;
						case 'search':
							let queryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _searchQuery: IQueryObject = And();
							for (const key of Object.keys(queryAttributs)) {
								if ( key == 'tags') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										In(key, queryAttributs[key] as string[])
									)
								} else if (key == 'description' || key == 'summary' || key == 'title') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, queryAttributs[key] as string)
									)
								} else {
									(_searchQuery['_and'] as IQueryObject[]).push(
										Eq(key, queryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								range = this.getNodeParameter('range', i, 'all') as string || 'all';
								sort = this.getNodeParameter('sort', i) as string;
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listCase"
										},
										{
											"_name": "filter",
											"_and": _searchQuery['_and']
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'cases' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								response = await search.call(this, `case`, { query: _searchQuery }, query);
							}
							let explodeOption = this.getNodeParameter('explode', i) as boolean;
							if (explodeOption) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'count':
							let countQueryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _countSearchQuery: IQueryObject = And();
							for (const key of Object.keys(countQueryAttributs)) {
								if ( key == 'tags') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										In(key, countQueryAttributs[key] as string[])
									)
								} else if (key == 'description' || key == 'summary' || key == 'title') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, countQueryAttributs[key] as string)
									)
								} else {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										Eq(key, countQueryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listCase"
										},
										{
											"_name": "filter",
											"_and": _countSearchQuery['_and']
										},
									]
								}
								
								body['query'].push(
									{
										"_name": "count"
									}
								)
								query = { name: 'count-cases' }
								response = await create.call(this, endpoint, body, query);
							} else {
								throw Error('Count in available only for API v1, please the version')
							}
							outputData.push({ json: {count:response} })
							break;
						case 'execute_responder':
							let objectId = this.getNodeParameter('id', i);
							let responders = this.getNodeParameter('responder', i) as string[];
							for (let responderId of responders) {
								body = {
									responderId,
									objectId,
									objectType: 'case'
								}
								response = await create.call(this, `connector/cortex/action`, body, query);
								body = {
									"query": [
										{
											"_name": "listAction"
										},
										{
											"_name": "filter",
											"_and": [
												{
													"_field": "cortexId",
													"_value": response.cortexId
												},
												{
													"_field": "objectId",
													"_value": response.objectId
												},
												{
													"_field": "startDate",
													"_value": response.startDate
												}
												
											]
										}
									]
								}
								query={name:'case-actions'}
								do {
									response = await theHiveApiRequest.call(this,'POST',`v1/query`,body,query,undefined,{});
									response = response[0];
								} while (response.status=="Waiting" || response.status=="InProgress" );  
								outputData.push({ json: response });
							}
							break;
						default:
							break;
					}
					break;
				case 'task':
					switch (operation) {
						case 'list':
							let caseId = this.getNodeParameter('caseId', i) as string;
							range = this.getNodeParameter('range', i, 'all') as string || 'all';
							sort = this.getNodeParameter('sort', i) as string;
							endpoint = 'v1/query';
							if (apiVersion == 'v1') {
								body = {
									"query": [
										{
											"_name": "getCase",
											"idOrName": caseId
										},
										{
											"_name": "tasks"
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'case-tasks' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								body={
									'query':{
										'_and':[Parent("case",Id(caseId))]
									}
								}
								response = await search.call(this, `case/task`, body, query);
							}
							let explode = this.getNodeParameter('explode', i) as boolean;
							if (explode) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'fetch':
							let fetchTaskId = this.getNodeParameter('id', i);
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								body = {
									"query": [
										{
											"_name": "getTask",
											"idOrName": fetchTaskId
										}
									]
								}
								query = { name: `get-task-${fetchTaskId}` }
								response = await create.call(this, endpoint, body, query);
								response = response[0];
							} else {
								response = await getOneById.call(this, `case/${resource}/${fetchTaskId}`, body, {});
							}
							outputData.push({ json: response });
							break;
						case 'create':
							let caseIdToAdd = this.getNodeParameter('caseId', i) as string;
							body = {
								title: this.getNodeParameter('title', i) as string,
								status: this.getNodeParameter('status', i) as string,
								flag: this.getNodeParameter('flag', i),
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							response = await create.call(this, `case/${caseIdToAdd}/task`, body, query);
							outputData.push({ json: response });
							break;
						case 'update':
							let id = this.getNodeParameter('id', i) as string;
							body = {
								...prepareOptional(this.getNodeParameter('optionals', i, {}) as INodeParameters)
							}
							response = await update.call(this, `case/task/${id}`, body, query);
							outputData.push({ json: response });
							break;
						case 'search':
							let _searchQuery: IQueryObject = And();
							let queryAttributs = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters)
							for (const key of Object.keys(queryAttributs)) {
								if (key == 'title' || key == 'description') {
									(_searchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, queryAttributs[key] as string)
									)
								} else {
									(_searchQuery['_and'] as IQueryObject[]).push(
										Eq(key, queryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								range = this.getNodeParameter('range', i, 'all') as string || 'all';
								sort = this.getNodeParameter('sort', i) as string;
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listTask"
										},
										{
											"_name": "filter",
											"_and": _searchQuery['_and']
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'tasks' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								response = await search.call(this, `case/task`, { query: _searchQuery }, query);
							}
							let explodeOption = this.getNodeParameter('explode', i) as boolean;
							if (explodeOption) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'count':
							let countQueryAttributs: any = prepareOptional(this.getNodeParameter('query', i, {}) as INodeParameters);
							let _countSearchQuery: IQueryObject = And();
							for (const key of Object.keys(countQueryAttributs)) {
								if (key == 'title' || key == 'description') {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										ContainsString(key, countQueryAttributs[key] as string)
									)
								} else {
									(_countSearchQuery['_and'] as IQueryObject[]).push(
										Eq(key, countQueryAttributs[key] as string)
									)
								}
							}
							if (apiVersion == 'v1') {
								
								endpoint = 'v1/query'
								body = {
									"query": [
										{
											"_name": "listTask"
										},
										{
											"_name": "filter",
											"_and": _countSearchQuery['_and']
										},
									]
								}

								body['query'].push(
									{
										"_name": "count"
									}
								)
								query = { name: 'count-tasks' }
								response = await create.call(this, endpoint, body, query);
							} else {
								throw Error('Count in available only for API v1, please the version')
							}
							outputData.push({ json: {count:response} })
							break;
						case 'execute_responder':
							let objectId = this.getNodeParameter('id', i);
							let responders = this.getNodeParameter('responder', i) as string[];
							for (let responderId of responders) {
								body = {
									responderId,
									objectId,
									objectType: 'case_task'
								}
								response = await create.call(this, `connector/cortex/action`, body, query);
								body = {
									"query": [
										{
											"_name": "listAction"
										},
										{
											"_name": "filter",
											"_and": [
												{
													"_field": "cortexId",
													"_value": response.cortexId
												},
												{
													"_field": "objectId",
													"_value": response.objectId
												},
												{
													"_field": "startDate",
													"_value": response.startDate
												}
												
											]
										}
									]
								}
								query={name:'task-actions'}
								do {
									response = await theHiveApiRequest.call(this,'POST',`v1/query`,body,query,undefined,{});
									response = response[0];
								} while (response.status=="Waiting" || response.status=="InProgress" ); 
								outputData.push({ json: response });
							}
							break;
						default:
							break;
					}
					break;
				case 'log':
					switch (operation) {
						case 'list':
							let taskid = this.getNodeParameter('taskId', i) as string;
							range = this.getNodeParameter('range', i, 'all') as string || 'all';
							sort = this.getNodeParameter('sort', i) as string;
							endpoint = 'v1/query';
							if (apiVersion == 'v1') {
								body = {
									"query": [
										{
											"_name": "getTask",
											"idOrName": taskid
										},
										{
											"_name": "logs"
										},
									]
								}
								prepareSortQuery(sort, body)
								prepareRangeQuery(range, body)
								query = { name: 'case-task-logs' }
								response = await create.call(this, endpoint, body, query);
							} else {
								query = prepareOptional({
									'sort': this.getNodeParameter('sort', i),
									'range': this.getNodeParameter('range', i, 'all')
								})
								let _searchQuery = And(Parent(
									"task",
									Id(taskid)
								))
								response = await search.call(this, `case/task/log`, { query: _searchQuery }, query);
							}
							let explode = this.getNodeParameter('explode', i) as boolean;
							if (explode) {
								outputData.push(...this.helpers.returnJsonArray(response));
							} else {
								outputData.push({ json: response })
							}
							break;
						case 'fetch':
							let fetchLogId = this.getNodeParameter('id', i);
							if (apiVersion == 'v1') {
								endpoint = 'v1/query';
								body = {
									"query": [
										{
											"_name": "getLog",
											"idOrName": fetchLogId
										}
									]
								}
								query = { name: `get-log-${fetchLogId}` }
								response = await create.call(this, endpoint, body, query);
								response = response[0];
							} else {
								body = {
									query: { "_id": fetchLogId }
								}
								response = await search.call(this, `case/task/${resource}`, body, {});
								if (response.length == 0) throw Error(`Log ${fetchLogId} not found`)
								response = response[0];
							}
							outputData.push({ json: response });
							break;
						case 'create':
							let taskId = this.getNodeParameter('taskId', i);
							let req_option = {}
							body = {
								message: this.getNodeParameter('message', i),
								startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
								status: this.getNodeParameter('status', i),
							}
							let options = this.getNodeParameter('optionals', i, {}) as { attachement: { value?: string, attachmentType: string, mimeType?: string, fileName?: string, data?: string } };
							if (options['attachement']) {
								let attachmentData;
								if (options['attachement']['attachmentType'] == 'path') {
									attachmentData = createReadStream(options['attachement']['value'] as string);
								} else if (options['attachement']['attachmentType'] == 'binary') {
									let mimeType = options['attachement']['mimeType'] as string;
									let fileName = options['attachement']['fileName'] as string;
									let data = options['attachement']['data'] as string;
									let buff = Buffer.from(data, 'base64');
									attachmentData = {
										value: buff,
										options: {
											filename: fileName,
											contentType: mimeType
										}
									}
								}
								req_option = {
									'formData': {
										'attachment': attachmentData,
										'_json': JSON.stringify({
											...body
										})
									}
								}
								body = {}
							}
							response = await theHiveApiRequest.call(this, 'POST', `case/task/${taskId}/log`, body, query, undefined, req_option)
							outputData.push({ json: response });
							break;
						case 'execute_responder':
							let objectId = this.getNodeParameter('id', i);
							let responders = this.getNodeParameter('responder', i) as string[];
							for (let responderId of responders) {
								body = {
									responderId,
									objectId,
									objectType: 'case_task_log'
								}
								response = await create.call(this, `connector/cortex/action`, body, query);
								body = {
									"query": [
										{
											"_name": "listAction"
										},
										{
											"_name": "filter",
											"_and": [
												{
													"_field": "cortexId",
													"_value": response.cortexId
												},
												{
													"_field": "objectId",
													"_value": response.objectId
												},
												{
													"_field": "startDate",
													"_value": response.startDate
												}
												
											]
										}
									]
								}
								query={name:'log-actions'}
								do {
									response = await theHiveApiRequest.call(this,'POST',`v1/query`,body,query,undefined,{});
									response = response[0];
								} while (response.status=="Waiting" || response.status=="InProgress" ); 
								outputData.push({ json: response });
							}
							break;
						default:
							break;
					}
					break;
				default:
					break;
			}
		}
		return this.prepareOutputData(outputData);
	}
}