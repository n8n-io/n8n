import { query } from 'express';
import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	apiRequest,
	apiRequestAllItems,
} from './GenericFunction';



export class Stackby implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Stackby',
		name: 'stackby',
		icon:'file:stackby-logo.png',
		group: ['transform'],
		version: 1,
		description: 'Node converts input data to chocolate',
		defaults: {
			name: 'Stackby',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				'name':'stackbyApiKey',
				'required':true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'My Operation',
				name: 'operation',
				type: 'options',
				options:[
					{
						name:'Append',
						value:'append',
					},
					{
						name:'Delete',
						value:'delete',
					},
					{
						name:'List',
						value:'list',
					},
					{
						name:'Read',
						value:'read',
					},
				],
				default: 'read',
				placeholder: 'Action to perform',
				description: 'The description text',
			},
			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Stack ID',
				name: 'stackId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the stack to access.',
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				default: '',
				placeholder: 'Stories',
				required: true,
				description: 'Enter Table Name',
			},

			// ----------------------------------
			//         read
			// ----------------------------------
			{
				displayName: 'Id',
				name: 'id',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'read','delete',
						],
					},
				},
				default: '',
				required: true,
				description: 'Id of the record to return.',
			},

			// ----------------------------------
			//         list
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				default: true,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						'operation': [
							'list',
						],
						'returnAll':[
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 1000,
				description: 'Number of results to return.',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				displayOptions: {
					show: {
						'operation': [
							'list',
						],
					},
				},
				typeOptions: {
					minValue: 0,
					maxValue: 1000,
				},
				default: 0,
				description: 'Number of results to return.',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'list',
						],
					},
				},
				default: {},
				description: 'Additional options which decide which records should be returned',
				placeholder: 'Add Option',
				options: [
					// {
					// 	displayName: 'Fields',
					// 	name: 'fields',
					// 	type: 'string',
					// 	typeOptions: {
					// 		multipleValues: true,
					// 		multipleValueButtonText: 'Add Field',
					// 	},
					// 	default: [],
					// 	placeholder: 'Name',
					// 	description: 'Only data for fields whose names are in this list will be included in the records.',
					// },
					// {
					// 	displayName: 'Filter By Formula',
					// 	name: 'filterByFormula',
					// 	type: 'string',
					// 	default: '',
					// 	placeholder: 'NOT({Name} = \'\')',
					// 	description: 'A formula used to filter records. The formula will be evaluated for each<br />record, and if the result is not 0, false, "", NaN, [], or #Error!<br />the record will be included in the response.',
					// },
					{
						displayName: 'Sort',
						name: 'sort',
						placeholder: 'Add Sort Rule',
						description: 'Defines how the returned records should be ordered.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Field',
										name: 'field',
										type: 'string',
										default: '',
										description: 'Name of the field to sort on.',
									},
									{
										displayName: 'Direction',
										name: 'direction',
										type: 'options',
										options: [
											{
												name: 'ASC',
												value: 'asc',
												description: 'Sort in ascending order (small -> large)',
											},
											{
												name: 'DESC',
												value: 'desc',
												description: 'Sort in descending order (large -> small)',
											},
										],
										default: 'asc',
										description: 'The sort direction.',
									},
								],
							},
						],
					},
					{
						displayName: 'View',
						name: 'view',
						type: 'string',
						default: '',
						placeholder: 'All Stories',
						description: 'The name or ID of a view in the Stories table. If set,<br />only the records in that view will be returned. The records<br />will be sorted according to the order of the view.',
					},
				],
			},

			// ----------------------------------
			//         append
			// ----------------------------------
			{
				displayName: 'recordData',
				name: 'recordData',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'append',
						],
					},
				},
				default: '',
				required: true,
				description: 'Enter Record Data',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		let responseData;

		//const returnData: IDataObject[] = [];
		//let responseData;

		const operation = this.getNodeParameter('operation', 0) as string;
		console.log(operation);

		const stackId = this.getNodeParameter('stackId', 0) as string;
		const table = encodeURI(this.getNodeParameter('table', 0) as string);
		const returnData: IDataObject[] = [];

		const returnAll = false;
		let endpoint = '';
		let requestMethod = '';

		let body = '';
		const qs: IDataObject = {};

		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		// for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// 	myString = this.getNodeParameter('myString', itemIndex, '') as string;
		// 	item = items[itemIndex];

		// 	item.json['myString'] = myString;
		// }

		if(operation === 'read')
		{
			requestMethod = 'GET';
			const rowIds=this.getNodeParameter('id', 0) as string;
			//qs = {rowIds:rowIds};
			endpoint = `rowlist/${stackId}/${table}?rowIds[]=${rowIds}`;
			responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
			console.log('data is here',responseData);

			returnData.push(responseData);
		}

		else if(operation === 'delete')
		{
			requestMethod = 'DELETE';
			const rowIds=this.getNodeParameter('id', 0) as string;
			//qs = {rowIds:rowIds};
			endpoint = `rowdelete/${stackId}/${table}?rowIds[]=${rowIds}`;
			responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
			console.log('data is here',responseData);

			returnData.push(responseData);
		}

		else if(operation === 'append')
		{	
			requestMethod = 'POST';
			const recordData=this.getNodeParameter('recordData', 0) as string;
			endpoint = `rowcreate/${stackId}/${table}`;
			body = recordData;
			console.log('1',body);
			body = JSON.parse(body);
			console.log('2',body);
			responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
			returnData.push(responseData);
		}

		else if(operation === 'list')
		{
			requestMethod = 'GET';
			const returnAll=this.getNodeParameter('returnAll', 0) as boolean;
			let limit=1000;
			if(returnAll===false){
				limit=this.getNodeParameter('limit', 0) as number;
			}
			qs.offset=this.getNodeParameter('offset', 0) as number;
			const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject;

			for (const key of Object.keys(additionalOptions)) {
				if (key === 'sort' && (additionalOptions.sort as IDataObject).property !== undefined) {
					qs.sort = (additionalOptions[key] as IDataObject).property;
				}  
				else {
					qs[key] = additionalOptions[key];
				}
			}
			qs.maxrecord =  limit;
			//qs.View = qs.view ? qs.view : null;

			endpoint = `rowlist/${stackId}/${table}`;
			const rowBody  = ''; 
			responseData = await apiRequest.call(this, requestMethod, endpoint, rowBody, qs);
			returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
