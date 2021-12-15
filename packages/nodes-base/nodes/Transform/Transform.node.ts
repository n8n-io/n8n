import {
	capitalize,
	escape,
	escapeRegExp,
	set,
	unescape,
} from 'lodash';

import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { defang, refang } from 'fanger';

export class Transform implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Transform',
		name: 'transform',
		icon: 'fa:random',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Provide transform utilities',
		defaults: {
			name: 'Transform',
			color: '#ff6d5a',
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
						name: 'Encode',
						description: 'Encode a string',
						value: 'encode',
					},
					{
						name: 'Decode',
						description: 'Decode a string',
						value: 'decode',
					},
					{
						name: 'Uppercase',
						description: 'Converts the text to upper case',
						value: 'uppercase',
					},
					{
						name: 'Lowercase',
						description: 'Converts the text to lower case',
						value: 'lowercase',
					},
					{
						name: 'Capitalise',
						description: 'Converts the first character of string to upper case and the remaining to lower case',
						value: 'capitalise',
					},
					{
						name: 'Titlecase',
						description: 'Converts the first character of every word to upper case',
						value: 'titlecase',
					},
					{
						name: 'Trim',
						description: 'Trim whitespace from a string',
						value: 'trim',
					},
					{
						name: 'Truncate',
						description: 'Truncate a string to a given length',
						value: 'truncate',
					},
					{
						name: 'Replace',
						description: 'Search and replace a value in a string',
						value: 'replace',
					},
					{
						name: 'Split',
						description: 'Split a string by separator',
						value: 'split',
					},
					{
						name: 'HTML Strip',
						description: 'Strip HTML tags from a string',
						value: 'stripHTML',
					},
					{
						name: 'Defang',
						description: 'Make a IP, URL, or email unclickable',
						value: 'defang',
					},
					{
						name: 'Refang',
						description: 'Make a defanged IP, URL, or email clickable',
						value: 'refang',
					},
				],
				default: 'encode',
			},
			{
				displayName: 'Encoding',
				name: 'encoding',
				displayOptions: {
					show: {
						action: [
							'encode',
							'decode',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'Base64',
						value: 'base64',
					},
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'URL',
						value: 'url',
					},
				],
				default: 'base64',
				required: true,
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'The value that should be transformed',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					hide: {
						updateRoot: [
							true,
						],
					},
				},
				description: 'Name of the property to write the result to',
			},
			// ----------------------------------
			// Encode/Decode
			// ----------------------------------
			{
				displayName: 'Update Root Object',
				name: 'updateRoot',
				displayOptions: {
					show: {
						action: [
							'decode',
						],
						encoding: [
							'json',
						],
					},
				},
				type: 'boolean',
				default: false,
				description: 'Update the root object with decoded data',
			},
			// ----------------------------------
			// Replace
			// ----------------------------------
			{
				displayName: 'Search',
				name: 'search',
				displayOptions: {
					show: {
						action: [
							'replace',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The string or pattern to search for',
				required: true,
			},
			{
				displayName: 'Replace',
				name: 'replace',
				displayOptions: {
					show: {
						action: [
							'replace',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The new value to replace the search string with',
				required: true,
			},
			{
				displayName: 'Replace All',
				name: 'replaceAll',
				displayOptions: {
					show: {
						action: [
							'replace',
						],
					},
				},
				type: 'boolean',
				default: true,
				description: 'Replace all occurrences of the search string',
			},
			{
				displayName: 'Regex',
				name: 'useRegex',
				displayOptions: {
					show: {
						action: [
							'replace',
						],
					},
				},
				type: 'boolean',
				default: false,
				description: 'Treate the search and replace string as regular expressions',
			},
			// ----------------------------------
			// Truncate
			// ----------------------------------
			{
				displayName: 'Max Length',
				name: 'maxLength',
				displayOptions: {
					show: {
						action: [
							'truncate',
						],
					},
				},
				type: 'number',
				default: 24,
				typeOptions: {
					minValue: 1,
				},
				description: 'The length to truncate the string to',
			},
			// ----------------------------------
			// Split
			// ----------------------------------
			{
				displayName: 'Separator',
				name: 'separator',
				displayOptions: {
					show: {
						action: [
							'split',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The separator to split the string on',
				required: true,
			},
			// ----------------------------------
			// Options
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						action: [
							'decode',
							'trim',
							'split',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Trim Type',
						name: 'trimOption',
						displayOptions: {
							show: {
								'/action': [
									'trim',
								],
							},
						},
						type: 'options',
						options: [
							{
								name: 'Start',
								value: 'start',
							},
							{
								name: 'End',
								value: 'end',
							},
						],
						default: 'end',
						description: 'Trim data from then end or start of the string',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						displayOptions: {
							show: {
								'/action': [
									'split',
								],
							},
						},
						type: 'number',
						default: -1,
						typeOptions: {
							minValue: -1,
						},
						description: 'The length to truncate results to',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		const length = items.length as unknown as number;
		const action = this.getNodeParameter('action', 0) as string;

		let item: INodeExecutionData;
		for (let i = 0; i < length; i++) {

			const dataPropertyName = this.getNodeParameter('dataPropertyName', i, '') as string;

			try {

				item = items[i];
				let newItem: INodeExecutionData;
				let newValue;
				const value = this.getNodeParameter('value', i) as string;

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

				if (action === 'encode') {
					const encoding = this.getNodeParameter('encoding', i) as string;
					if (encoding === 'base64') {
						newValue = Buffer.from(value).toString('base64');
					} else if (encoding === 'html') {
						newValue = escape(value);
					} else if (encoding === 'json') {
						newValue = JSON.stringify(value);
					} else if (encoding === 'url') {
						newValue = encodeURI(value);
					}
				} else if (action === 'decode') {
					const encoding = this.getNodeParameter('encoding', i) as string;
					if (encoding === 'base64') {
						newValue = Buffer.from(value, 'base64').toString();
						// try {
						// 	Buffer.from(value, 'base64').toString();
						// } catch (error) {
						// 	newValue = value;
						// }
					} else if (encoding === 'html') {
						newValue = unescape(value);
					} else if (encoding === 'json') {
						const updateRoot = this.getNodeParameter('updateRoot', i, false) as boolean;
						newValue = JSON.parse(value);
						if (updateRoot) {
							newItem.json = {
								...newItem.json,
								...newValue,
							};
							returnData.push(newItem);
							continue;
						}
					} else if (encoding === 'url') {
						newValue = decodeURI(value);
						// try {
						// 	newValue = decodeURI(value);
						// } catch (error) {
						// 	newValue = value;
						// }
					}
				} else if (action === 'uppercase') {
					newValue = value.toUpperCase();
				} else if (action === 'lowercase') {
					newValue = value.toLowerCase();
				} else if (action === 'capitalise') {
					newValue = capitalize(value);
				} else if (action === 'titlecase') {
					newValue = value.replace(/\w+/g, capitalize);
				} else if (action === 'trim') {
					const trimOption = this.getNodeParameter('options.trimOption', i, '') as string;
					if (trimOption === 'start') {
						newValue = value.trimStart();
					} else if (trimOption === 'end') {
						newValue = value.trimEnd();
					} else {
						newValue = value.trim();
					}
				} else if (action === 'truncate') {
					const maxLength = this.getNodeParameter('maxLength', i) as number;
					newValue = value.substring(0, maxLength);
				} else if (action === 'replace') {
					const search = this.getNodeParameter('search', i) as string;
					const replace = this.getNodeParameter('replace', i) as string;
					const useRegex = this.getNodeParameter('useRegex', i) as boolean;
					const replaceAll = this.getNodeParameter('replaceAll', i, true) as boolean;
					const flags = replaceAll ? 'g' : '';
					if (useRegex) {
						const regex = new RegExp(search, flags);
						newValue = value.replace(regex, replace);
					} else {
						if (replaceAll) {
							const regex = new RegExp(escapeRegExp(search), flags);
							newValue = value.replace(regex, replace);
						} else {
							newValue = value.replace(search, replace);
						}
					}
				} else if (action === 'split') {
					const separator = this.getNodeParameter('separator', i) as string;
					const limit = this.getNodeParameter('options.limit', i, -1) as number;
					newValue = value.split(separator, limit);
				} else if (action === 'stripHTML') {
					newValue = value.replace(/(<([^>]+)>)/gi, '');
				} else if (action === 'defang') {
					newValue = defang(value);
				} else if (action === 'refang') {
					newValue = refang(value);
				}

				set(newItem, `json.${dataPropertyName}`, newValue);

				returnData.push(newItem);
			
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
