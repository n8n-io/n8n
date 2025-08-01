import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { OdooCredentialsInterface } from '../../GenericFunctions';
import { odooHTTPRequest } from '../../GenericFunctions';

export const properties: INodeProperties[] = [
	{
		displayName: 'Method Name',
		name: 'methodName',
		type: 'string',
		description: 'Choose a method to execute on the custom resource',
		default: '',
		required: true,
	},
	{
		displayName: 'Method Arguments',
		name: 'methodArgs',
		type: 'fixedCollection',
		description: 'Arguments to pass to the method',
		default: {},
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Argument',
		},
		placeholder: 'Add Argument',
		options: [
			{
				displayName: 'Argument',
				name: 'args',
				values: [
					{
						displayName: 'Argument Value',
						name: 'argValue',
						type: 'string',
						default: '',
						placeholder: 'Could be a number, a string, an array or a tupple',
					},
				],
			},
		],
	},
	{
		displayName: 'Method Keyword Arguments',
		name: 'methodKwargs',
		type: 'fixedCollection',
		description: 'Keyword arguments to pass to the method',
		default: {},
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Keyword Argument',
		},
		placeholder: 'Add Keyword Argument',
		options: [
			{
				name: 'kwargs',
				displayName: 'Keyword Argument',
				values: [
					{
						displayName: 'Keyword Argument Name',
						name: 'kwargName',
						type: 'string',
						default: '',
						placeholder: 'limit',
					},
					{
						displayName: 'Keyword Argument Value',
						name: 'kwargValue',
						type: 'string',
						default: '',
						placeholder: '10',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['executeMethod'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
	credentials: OdooCredentialsInterface,
	customResource: string,
) {
	const methodName = this.getNodeParameter('methodName', index) as string;

	const methodArgsArray = (this.getNodeParameter('methodArgs', index) as IDataObject)?.args;
	const methodArgsValues = Array.isArray(methodArgsArray)
		? methodArgsArray
				.map((arg) => {
					const value = arg.argValue;

					if (typeof value === 'string') {
						if (!isNaN(Number(value))) {
							return Number(value);
						} else {
							try {
								const cleanedValue = value
									.replace(/\(/g, '[') // Replace '(' with '['
									.replace(/\)/g, ']'); // Replace ')' with ']'
								const parsed = JSON.parse(cleanedValue);
								if (Array.isArray(parsed)) {
									return parsed;
								}
							} catch (error) {
								return value;
							}
						}
					}
					return value;
				})
				.filter((val) => val != undefined)
		: [];

	const methodKwargsArray = (this.getNodeParameter('methodKwargs', index) as IDataObject)?.kwargs;
	const methodKwargs = Array.isArray(methodKwargsArray)
		? methodKwargsArray.reduce(
				(acc, { kwargName, kwargValue }) => {
					acc[kwargName] = kwargValue;
					return acc;
				},
				{} as Record<string, string>,
			)
		: {};

	return await odooHTTPRequest.call(
		this,
		credentials,
		customResource,
		methodName,
		methodArgsValues,
		methodKwargs,
	);
}
