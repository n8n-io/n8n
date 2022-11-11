import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const description: INodeProperties[] = [];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	const rows = items.length;
	const columns = items.reduce((max, item) => Math.max(max, Object.keys(item.json).length), 0);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray([{ rows, columns }]),
		{ itemData: { item: 0 } },
	);

	return executionData;
}
