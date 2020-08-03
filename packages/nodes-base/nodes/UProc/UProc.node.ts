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
	uprocApiRequest,
} from './GenericFunctions';

import {
	groupOptions,
} from './GroupDescription';

import {
	toolOperations,
	toolParameters,
} from './ToolDescription';

export class UProc implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'uProc',
		name: 'uproc',
		icon: 'file:uproc.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["tool"]}}',
		description: 'Consume uProc API',
		defaults: {
			name: 'UProc',
			color: '#219ef9',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'uprocApi',
				required: true,
			},
		],
		properties: [
			...groupOptions,
			...toolOperations,
			...toolParameters,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const group = this.getNodeParameter('group', 0) as string;
		const tool = this.getNodeParameter('tool', 0) as string;

		interface LooseObject {
			[key: string]: any;
		}

	const fields = toolParameters.filter((field) => {
		return field && field.displayOptions && field.displayOptions.show && field.displayOptions.show.group && field.displayOptions.show.tool &&
			field.displayOptions.show.group.indexOf(group) !== -1 && field.displayOptions.show.tool.indexOf(tool) !== -1;
		}).map((field) => {
			return field.name;
		});

		for (let i = 0; i < length; i++) {
			const body: LooseObject = {
				processor: tool,
				params: {}
			};

			fields.forEach((field) => {
				if (field && field.length) {
					const data = this.getNodeParameter(field, i) as string;
					body.params[field] = data;
				}
			});

			responseData = await uprocApiRequest.call(this, 'POST', body);

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
