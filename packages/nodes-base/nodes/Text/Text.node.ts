import { set } from 'lodash';

import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

export class Text implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Text',
		name: 'text',
		icon: 'file:text.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Allows you to manipulate strings',
		defaults: {
			name: 'Text',
			color: '#408000',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Encode/Decode',
						value: 'encodeDecode',
						description: 'Encode/Decode string',
					},
					{
						name: 'Include',
						value: 'include',
						description: 'Determines whether one string may be found within another string,',
					},
					{
						name: 'Split',
						value: 'split',
						description: 'Splits string ',
					},
					{
						name: 'URL Encode/Decode',
						value: 'urlEncodeDecode',
						description: 'URL Encode/Decode',
					},
					{
						name: 'Upper Case',
						value: 'upperCase',
						description: 'Upper case all characters ',
					},
					{
						name: 'Lower Case',
						value: 'lowerCase',
						description: 'Lower case all characters ',
					},
				],
				default: 'split',
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: [
							'split',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted.',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: [
							'split',
						],
					},
				},
				description: 'Name of the property to which to write the converted string.',
			},
			{
				displayName: 'Split By',
				name: 'splitBy',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'split',
						],
					},
				},
			},
			{
				displayName: 'Index',
				name: 'index',
				type: 'number',
				default: 0,
				required: true,
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				displayOptions: {
					show: {
						action: [
							'split',
						],
					},
				},
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: [
							'encodeDecode',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted.',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: [
							'encodeDecode',
						],
					},
				},
				description: 'Name of the property to which to write the converted string.',
			},
			{
				displayName: 'To Encoding',
				name: 'toEncoding',
				type: 'options',
				default: 'base64',
				options: [
					{
						name: 'BASE64',
						value: 'base64',
						description: 'Base64 encoding.',
					},
					{
						name: 'HEX',
						value: 'hex',
						description: 'encode each byte as two hexadecimal characters. ',
					},
					{
						name: 'UTF8',
						value: 'utf8',
						description: 'Multibyte encoded Unicode characters. Many web pages and other document formats use UTF-8.',
					},
				],
				required: true,
				displayOptions: {
					show: {
						action: [
							'encodeDecode',
						],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				displayOptions: {
					show: {
						action:[
							'encodeDecode'
						],
					},
				},
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'From Encoding',
						name: 'fromEncoding',
						type: 'options',
						default: 'utf8',
						options: [
							{
								name: 'BASE64',
								value: 'base64',
								description: 'Base64 encoding.',
							},
							{
								name: 'HEX',
								value: 'hex',
								description: 'encode each byte as two hexadecimal characters. ',
							},
							{
								name: 'UTF8',
								value: 'utf8',
								description: 'Multibyte encoded Unicode characters. Many web pages and other document formats use UTF-8.',
							},
						],
					},
				],
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: [
							'include',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted.',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: [
							'include',
						],
					},
				},
				description: 'Name of the property to which to write the converted string.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'include',
						],
					},
				},
				description: 'Text you want to look for',
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: [
							'urlEncodeDecode',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted.',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: [
							'urlEncodeDecode',
						],
					},
				},
				description: 'Name of the property to which to write the converted string.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				displayOptions: {
					show: {
						action: [
							'urlEncodeDecode',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'DECODE',
						value: 'decode',
					},
					{
						name: 'ENCODE',
						value: 'encode',
					},
				],
				default: 'decode',
				required: true,
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: [
							'upperCase',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted.',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: [
							'upperCase',
						],
					},
				},
				description: 'Name of the property to which to write the converted string.',
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: [
							'lowerCase',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted.',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: [
							'lowerCase',
						],
					},
				},
				description: 'Name of the property to which to write the converted string.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;
		const returnData: INodeExecutionData[] = [];
		let item: INodeExecutionData;

		for (let i = 0; i < length; i++) {
			const action = this.getNodeParameter('action', 0) as string;
			item = items[i];

			if (action === 'split') {
				const value = this.getNodeParameter('value', i) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				let splitBy = this.getNodeParameter('splitBy', i) as string;
				const index = this.getNodeParameter('index', i) as number;
				if (splitBy === 'space') {
					splitBy = ' ';
				}
				let newValue = value.split(splitBy as string) as string[];
				if (newValue[index] === undefined) {
					throw Error(`Index ${index} does not exist`);
				}
				//@ts-ignore
				newValue = newValue[index];
				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(item.json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			}
			if (action === 'encodeDecode') {
				const value = this.getNodeParameter('value', i) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				const toEncoding = this.getNodeParameter('toEncoding', i) as string;
				const options = this.getNodeParameter('options', i) as IDataObject;
				let fromEncoding = 'utf8';
				let newValue ;
				if (options.fromEncoding) {
					fromEncoding = options.fromEncoding as string;
				}
				newValue = Buffer.from(value, fromEncoding).toString(toEncoding);
				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(item.json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			}
			if (action === 'include') {
				const value = this.getNodeParameter('value', i) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				const text = this.getNodeParameter('text', i) as string;
				let newValue = false;
				if (value.includes(text)) {
					newValue = true;
				}
				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(item.json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			}
			if (action === 'urlEncodeDecode') {
				const value = this.getNodeParameter('value', i) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let newValue;
				if (operation === 'encode') {
					newValue = encodeURI(value.trim());
				} else {
					newValue = decodeURI(value.trim());
				}
				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(item.json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			}
			if (action === 'upperCase') {
				const value = this.getNodeParameter('value', i) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				const newValue = value.toUpperCase();
				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(item.json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			}
			if (action === 'lowerCase') {
				const value = this.getNodeParameter('value', i) as string;
				const dataPropertyName = this.getNodeParameter('dataPropertyName', i) as string;
				const newValue = value.toLocaleLowerCase();
				let newItem: INodeExecutionData;
				if (dataPropertyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(item.json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...item.json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
