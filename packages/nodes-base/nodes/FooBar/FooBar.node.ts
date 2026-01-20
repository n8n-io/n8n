import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class FooBar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Foo Bar',
		name: 'fooBar',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Returns JSON with property foo set to the value of parameter foo',
		defaults: {
			name: 'Foo Bar',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Foo',
				name: 'foo',
				type: 'string',
				default: '',
				placeholder: 'Enter foo value',
				description: 'The value to set in the output JSON property foo',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let foo: string;

		// Iterates over all input items and add the key "foo" with the
		// value the parameter "foo" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				foo = this.getNodeParameter('foo', itemIndex, '') as string;
				item = items[itemIndex];

				item.json.foo = foo;
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [items];
	}
}
