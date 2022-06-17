import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';

import { nimflowApiRequest } from './GenericFunctions'

import {
	contextOperations,
	contextFields
} from './ContextDescription'

import {
	commonFields
} from './CommonFields'
import { ItemLists } from '../ItemLists/ItemLists.node';

export class Nimflow implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Nimflow',
			name: 'nimflow',
			icon: 'file:nimflow.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Nimflow API',
			defaults: {
					name: 'Nimflow',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'nimflowApi',
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
									name: 'Context',
									value: 'context'
							},
							{
								name: 'Task',
								value: 'task'
							},
							{
								name: 'Function',
								value: 'function'
						  }
					],
					default: 'context',
					required: true,
				},
				...contextOperations,
				...commonFields,
				...contextFields,
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource',0) as string;
		const operation = this.getNodeParameter('operation',0) as string;
		const method = 'POST';
		let returnData = [];

		switch(resource){
			case "context":{
				switch(operation){
					case "dispatch":{
						const method = 'POST';
						const endpoint = '/Contexts/DispatchAction';
						for( let i = 0; i < items.length; i++ ){
							const contextTypeName = this.getNodeParameter('contextTypeName',i) as string;
							const reference = this.getNodeParameter('reference', i) as string;
							const action = this.getNodeParameter('action', i) as string;
							const payload = getNodeParameterAsObject.call(this,'payload', i);
							const body = {
								contextTypeName,
								reference,
								action,
								payload
							};
							const responseData = await nimflowApiRequest.call(this, method, endpoint, body);
							returnData.push(responseData);
						}
						break;
					}
				}
			}
			case "task":{
				switch(operation){
					case "searchAndUpdate":{
						const method = 'POST';
						const endpoint = '/Tasks/SearchAndUpdate'
						for( let i = 0; i < items.length; i++ ){
							const contextTypeName = this.getNodeParameter('contextTypeName',i) as string;
							const typeName = this.getNodeParameter('taskTypeName',i) as string;
							const contextReference = this.getNodeParameter('reference', i) as string;
							const body = {
								search: {
									contextTypeName,
									contextReference,
									typeName
								}
							};
							const response = await nimflowApiRequest.call(this, method, endpoint, body);
						}
					}
					case "addResponse":{

					}
				}
			}
			case "function":{
				switch(operation){
					case "call": {

					}
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

function getNodeParameterAsObject(this: IExecuteFunctions, parameterName: string, index: number ): IDataObject {
	const parameter = this.getNodeParameter(parameterName, index) as IDataObject | string;
	if( typeof parameter === 'string'){
		try {
			return JSON.parse(parameter);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `The data in Payload is no valid JSON`);
		}
	}
	return parameter;
}
