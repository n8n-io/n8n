import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { unspin } from './spintax';

export class Spintax implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spintax',		
		name: 'spintax',
		icon: 'file:spintax.png',
		group: ['transform'],
		version: 1,
		description: 'Parse Spintax formatted text (nested Spintax supported).',
		defaults: {
			name: 'Spintax',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Spintax',
				name: 'spintax',
				type: 'string',
				default: '{Hello|Hi {there|again}} John!',
				placeholder: 'Spintax formatted text',
				description: 'Spintax formatted text',
			}
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// Itterates over all input items
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const spintaxFormat = this.getNodeParameter('spintax', itemIndex, '') as string;
			const item = items[itemIndex];

			const text = unspin(spintaxFormat);
			item.json['text'] = text;
		}

		return this.prepareOutputData(items);

	}
}
