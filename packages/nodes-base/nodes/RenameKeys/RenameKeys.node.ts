import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { get, set, unset } from 'lodash';
import { options } from 'rhea';

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
				displayName: 'Keys',
				name: 'keys',
				placeholder: 'Add new key',
				description: 'Adds a key which should be renamed',
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
								description:
									'The current name of the key. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".',
							},
							{
								displayName: 'New Key Name',
								name: 'newKey',
								type: 'string',
								default: '',
								placeholder: 'newKey',
								description:
									'The name the key should be renamed to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey".',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Regex',
						name: 'regexReplacement',
						placeholder: 'Add new regular expression',
						description: 'Adds a regular expressiond',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						default: {},
						options: [
							{
								displayName: 'Replacement',
								name: 'replacements',
								values: [
									{
										displayName:
											'Be aware that by using regular expression previously renamed keys can be affected',
										name: 'regExNotice',
										type: 'notice',
										default: '',
									},
									{
										displayName: 'Regular Expression',
										name: 'searchRegex',
										type: 'string',
										default: '',
										placeholder: 'e.g. [N-n]ame',
										description: 'Regex to match the key name',
										hint: 'Learn more and test RegEx <a href="https://regex101.com/">here</a>',
									},
									{
										displayName: 'Replace With',
										name: 'replaceRegex',
										type: 'string',
										default: '',
										placeholder: 'replacedName',
										description:
											"The name the key/s should be renamed to. It's possible to use regex captures e.g. $1, $2, ...",
									},
									{
										displayName: 'Options',
										name: 'options',
										type: 'collection',
										default: {},
										placeholder: 'Add Regex Option',
										options: [
											{
												displayName: 'Case Insensitive',
												name: 'caseInsensitive',
												type: 'boolean',
												description: 'Whether to use case insensitive match',
												default: false,
											},
											{
												displayName: 'Max Depth',
												name: 'depth',
												type: 'number',
												default: -1,
												description: 'Maximum depth to replace keys',
												hint: 'Specify number for depth level (-1 for unlimited, 0 for top level only)',
											},
										],
									},
								],
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
			const regexReplacements = this.getNodeParameter(
				'additionalOptions.regexReplacement.replacements',
				itemIndex,
				[],
			) as IDataObject[];

			item = items[itemIndex];

			// Copy the whole JSON data as data on any level can be renamed
			newItem = {
				json: JSON.parse(JSON.stringify(item.json)),
				pairedItem: {
					item: itemIndex,
				},
			};

			if (item.binary !== undefined) {
				// Reference binary data if any exists. We can reference it
				// as this nodes does not change it
				newItem.binary = item.binary;
			}

			renameKeys.forEach((renameKey) => {
				if (
					renameKey.currentKey === '' ||
					renameKey.newKey === '' ||
					renameKey.currentKey === renameKey.newKey
				) {
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

			regexReplacements.forEach((replacement) => {
				const { searchRegex, replaceRegex, options } = replacement;
				const { depth, caseInsensitive } = options as IDataObject;

				const flags = (caseInsensitive as boolean) ? 'i' : undefined;

				const regex = new RegExp(searchRegex as string, flags);

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
								const newKey = key.replace(regex, replaceRegex as string);
								if (newKey !== key) {
									obj[newKey] = obj[key];
									delete obj[key];
								}
							}
						}
					}
					return obj;
				};
				newItem.json = renameObjectKeys(newItem.json, depth as number);
			});

			returnData.push(newItem);
		}

		return [returnData];
	}
}
