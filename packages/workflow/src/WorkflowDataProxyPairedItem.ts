import type { INodeExecutionData, IPairedItemData, ISourceData, ITaskData } from './Interfaces';

export const PAIRED_ITEM_METHOD = {
	PAIRED_ITEM: 'pairedItem',
	ITEM_MATCHING: 'itemMatching',
	ITEM: 'item',
	$GET_PAIRED_ITEM: '$getPairedItem',
} as const;

export type PairedItemMethod = (typeof PAIRED_ITEM_METHOD)[keyof typeof PAIRED_ITEM_METHOD];

export function normalizeInputs(
	pairedItem: IPairedItemData,
	sourceData: ISourceData | null,
): [IPairedItemData, ISourceData | null] {
	if (typeof pairedItem === 'number') {
		pairedItem = { item: pairedItem };
	}
	const finalSource = pairedItem.sourceOverwrite ?? sourceData;
	return [pairedItem, finalSource];
}

export function pinDataToTask(pinData: INodeExecutionData[] | undefined): ITaskData | undefined {
	if (!pinData) return undefined;
	return {
		data: { main: [pinData] },
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: [],
	};
}
