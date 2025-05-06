import type {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Schema implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Schema',
		name: 'schema',
		icon: 'fa:schema',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Validate input data against a schema',
		defaults: {
			name: 'Schema',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Validate Data',
						value: 'validateData',
					},
				],
				default: 'validateData',
			},
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'schemaSelector',
				displayOptions: {
					show: {
						operation: ['validateData'],
					},
				},
				default: '',
			},
			{
				displayName: 'Input Data',
				name: 'input',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						operation: ['validateData'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				if (operation === 'validateData') {
					// ----------------------------------
					//       generateHtmlTemplate
					// ----------------------------------

					const schema = this.getNodeParameter('schema', 0) as string;

					const input = this.getNodeParameter('input', itemIndex) as string;

					console.log(typeof input);
					console.log(input);

					await this.helpers.isValid(schema, input);

					const result = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ input }),
						{
							itemData: { item: itemIndex },
						},
					);

					returnData.push(...result);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw error;
			}
		}

		return [returnData];
	}
}
