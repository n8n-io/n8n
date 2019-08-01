import { IExecuteFunctions } from 'n8n-core';
import {
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
		description: 'Renames keys.',
		defaults: {
			name: 'Rename Keys',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		changesIncomingData: {
			value: true,
			keys: 'json',
		},
		properties: [
			{
				displayName: 'Keys',
				name: 'keys',
				placeholder: 'Add new key',
				description: 'Adds a key which should be renamed.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
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
						]
					},
				],
			}
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		let item: INodeExecutionData;
		let renameKeys: IRenameKey[];
		let value: any; // tslint:disable-line:no-any
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			renameKeys = this.getNodeParameter('keys.key', itemIndex, []) as IRenameKey[];
			item = items[itemIndex];

			renameKeys.forEach((renameKey) => {
				if (renameKey.currentKey === '' || renameKey.newKey === '') {
					// Ignore all which do not have all the values set
					return;
				}
				value = get(item.json, renameKey.currentKey as string);
				if (value === undefined) {
					return;
				}
				set(item.json, renameKey.newKey, value);

				unset(item.json, renameKey.currentKey as string);
			});
		}

		return this.prepareOutputData(items);
	}
}
