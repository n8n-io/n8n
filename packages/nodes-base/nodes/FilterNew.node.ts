import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeParameterValue,
} from 'n8n-workflow';


export class FilterNew implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FilterNew',
		name: 'filter-new',
		icon: 'fa:map-signs',
		group: ['transform'],
		version: 1,
		description: 'Filter only new items through',
		subtitle: 'unique({{$parameter["field"]}})'
		defaults: {
			name: 'FilterNew',
			description: 'Filter only new items through',
			color: '#506000',
		},
		inputs: ['main'],
		outputs: ['main'],
		outputNames: ['filtered'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'ID-Based',
						value: 'idbased',
						description: 'Filter based on some unique identifier',
					},
					{
						name: 'Timestamp',
						value: 'timestamp',
						description: 'Filter based on a timestamp field',
					},
				],
				default: 'idbased',
				description: 'How data should be filtered',
			},


			// ----------------------------------
			//         mode:identifier
			// ----------------------------------
			{
				displayName: 'Identifier Field',
				name: 'field',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'idbased',
						],
					},
				},
				default: "",
				description: 'The identifier in the item to filter by',
			},
			// ----------------------------------
			//         mode:timestamp
			// ----------------------------------
			{
				displayName: 'Timestamp Field',
				name: 'field',
				type: 'dateTime',
				displayOptions: {
					show: {
						mode: [
							'timestamp',
						],
					},
				},
				default: 0,
				description: 'The timestamp in the item to filter by',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[][] = [
			[],
		];

		const items = this.getInputData();

		let item: INodeExecutionData;
		let tsField: NodeParameterValue;

		// Converts the input data of a dateTime into a number for easy compare
		const convertDateTime = (value: NodeParameterValue): number => {
			let returnValue: number | undefined = undefined;
			if (typeof value === 'string') {
				returnValue = new Date(value).getTime();
			} else if (typeof value === 'number') {
				returnValue = value;
			} if ((value as unknown as object) instanceof Date) {
				returnValue = (value as unknown as Date).getTime();
			}

			if (returnValue === undefined || isNaN(returnValue)) {
				throw new NodeOperationError(this.getNode(), `The value "${value}" is not a valid DateTime.`);
			}

			return returnValue;
		};

		const checkIndexRange = (index: number) => {
			if (index < 0 || index >= returnData.length) {
				throw new NodeOperationError(this.getNode(), `The ouput ${index} is not allowed. It has to be between 0 and ${returnData.length - 1}!`);
			}
		};

		const staticData = this.getWorkflowStaticData('node');
		const mode = this.getNodeParameter('mode', 0) as string;
		if (mode === 'idbased') {
			staticData.seenIds = staticData.seenIds || new Set();
		}
		const seenIds = staticData.seenIds as Set<string>;
		// Iterate over all items to check to which output they should be routed to
		itemLoop:
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {

				item = items[itemIndex];

				if (mode === 'idbased') {
					const id = this.getNodeParameter('field', itemIndex) as string;
					if (seenIds.has(id)) {
						continue;
					} else {
						seenIds.add(id);
						returnData[0].push(item);
					}
				} else if (mode === 'timestamp') {
					tsField = convertDateTime(this.getNodeParameter('field', itemIndex) as NodeParameterValue);
					if (staticData.lastTs && staticData.lastTs > tsField) {
						continue;
					} else {
						staticData.lastTs = tsField;
						returnData[0].push(item);
					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({json:{ error: error.message }});
					continue;
				}
				throw error;
			}
		}

		return returnData;
	}
}
