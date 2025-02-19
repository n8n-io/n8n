import type { IExecuteFunctions, INodeExecutionData, IPairedItemData } from 'n8n-workflow';
import { Square } from '../../../nodes/Square/Square.node';

export async function executeNode(
	node: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[][]> {
	const square = new Square();
	const context = {
		...node,
		getInputData: () => items,
		continueOnFail: () => false,
		getNode: () => ({ type: 'n8n-nodes-base.square' }),
		helpers: {
			...node.helpers,
			constructExecutionMetaData: (
				data: INodeExecutionData[],
				options: { itemData: { item: number } },
			) => {
				return data.map((item) => ({
					...item,
					pairedItem: { item: options.itemData.item } as IPairedItemData,
				}));
			},
			returnJsonArray: (data: any) => [{ json: data }],
		},
	} as IExecuteFunctions;

	return await square.execute.call(context);
}
