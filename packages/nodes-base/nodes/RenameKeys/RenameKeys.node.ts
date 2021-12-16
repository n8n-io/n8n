import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	get,
	set,
	unset,
} from 'lodash';

interface IRenameKey {
	currentKey: string;
	newKey: string;
}

export class RenameKeys implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Rename Keys',
		name: 'renameKeys',
		icon: 'fa:edit',
		group: ['transform'],
		version: 1,
		description: 'Renames keys',
		defaults: {
			name: 'Rename Keys',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Regex',
				name: 'useRegex',
				type: 'boolean',
				default: false,
				description: 'Use regex to match and replace keys',
			},
			{
				displayName: 'Key search',
				name: 'searchRegex',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'Regex to match the key name',
				displayOptions: {
					show: {
						useRegex: [
							true,
						],
					},
				},
			},
			{
				displayName: 'Key replace',
				name: 'replaceRegex',
				type: 'string',
				default: '',
				placeholder: '',
				description: 'The name the key/s should be renamed to. It\'s possible to use regex captures e.g. $1, $2, ... ',
				displayOptions: {
					show: {
						useRegex: [
							true,
						],
					},
				},
			},	
			{
				displayName: 'Max Depth',
				name: 'depth',
				type: 'number',
				default: -1,
				description: 'Maximum depth to replace keys (-1 for unlimited, 0 for top level only)',
				displayOptions: {
					show: {
						useRegex: [
							true,
						],
					},
				},
			},
			{
				displayName: 'Keys',
				name: 'keys',
				placeholder: 'Add new key',
				description: 'Adds a key which should be renamed.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				options: [
					{
						displayName: 'Key',
						name: 'key',
						values: [
							{
								displayName: 'Current Key Name',
								name: 'currentKey',
								type: 'string',
								default: '',
								placeholder: 'currentKey',
								description: 'The current name of the key. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey"',
							},
							{
								displayName: 'New Key Name',
								name: 'newKey',
								type: 'string',
								default: '',
								placeholder: 'newKey',
								description: 'the name the key should be renamed to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey"',
							},
						],
					},
				],
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let newItem: INodeExecutionData;
		let renameKeys: IRenameKey[];
		let value: any; // tslint:disable-line:no-any
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			renameKeys = this.getNodeParameter('keys.key', itemIndex, []) as IRenameKey[];
			item = items[itemIndex];

			// Copy the whole JSON data as data on any level can be renamed
			newItem = {
				json: JSON.parse(JSON.stringify(item.json)),
			};

			if (item.binary !== undefined) {
				// Reference binary data if any exists. We can reference it
				// as this nodes does not change it
				newItem.binary = item.binary;
			}

			renameKeys.forEach((renameKey) => {
				if (renameKey.currentKey === '' || renameKey.newKey === '' || renameKey.currentKey === renameKey.newKey) {
					// Ignore all which do not have all the values set or if the new key is equal to the current key
					return;
				}
				value = get(item.json, renameKey.currentKey as string);
				if (value === undefined) {
					return;
				}
				set(newItem.json, renameKey.newKey, value);

				unset(newItem.json, renameKey.currentKey as string);
			});

			const useRegex = this.getNodeParameter('useRegex', itemIndex) as boolean;

			if (useRegex) {
				const maxDepth = this.getNodeParameter('depth', itemIndex, -1) as number;
				const searchRegex = this.getNodeParameter('searchRegex', itemIndex) as string;
				const replaceRegex = this.getNodeParameter('replaceRegex', itemIndex) as string;
				// const uppercase = this.getNodeParameter('uppercase', itemIndex, false) as string;
				// const lowercase = this.getNodeParameter('lowercase', itemIndex, false) as string;
				// Replace Object keys up to certain depth
				const regex = new RegExp(searchRegex);
				const renameObjectKeys = (obj: IDataObject, depth: number) => {
					for (const key in obj) {
						if (Array.isArray(obj)) {
							// Don't rename array object references
							if (depth !== 0) {
								renameObjectKeys(obj[key] as IDataObject, depth - 1);
							}
						} else if (obj.hasOwnProperty(key)) {
							if (typeof obj[key] === 'object' && depth !== 0) {
								renameObjectKeys(obj[key] as IDataObject, depth - 1);
							}
							if (key.match(regex)) {
								const newKey = key.replace(regex, replaceRegex);
								// newKey = uppercase ? newKey.toUpperCase() : newKey;
								// newKey = lowercase ? newKey.toLowerCase() : newKey;
								if (newKey !== key) {
									obj[newKey] = obj[key];
									console.log(`Replacing ${key} with ${newKey}`);
									delete obj[key];
								}
							}
						}
					}
					return obj;
				};
				newItem.json = renameObjectKeys(newItem.json, maxDepth);
			}
			returnData.push(newItem);
		}

		return [returnData];
	}
}
