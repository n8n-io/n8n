import type { INodeExecutionData, IPairedItemData, ISourceData } from 'n8n-workflow';

const addSourceOverwrite = (
	pairedItem: IPairedItemData | number,
	source: ISourceData,
): IPairedItemData => {
	if (typeof pairedItem === 'number') {
		return {
			item: pairedItem,
			sourceOverwrite: source,
		};
	}

	return {
		...pairedItem,
		sourceOverwrite: source,
	};
};

export function getPairedItemInformation(
	item: INodeExecutionData,
	source: ISourceData,
): IPairedItemData | IPairedItemData[] {
	if (item.pairedItem === undefined) {
		return {
			item: 0,
			sourceOverwrite: source,
		};
	}

	if (Array.isArray(item.pairedItem)) {
		return item.pairedItem.map((pairedItem) => addSourceOverwrite(pairedItem, source));
	}

	return addSourceOverwrite(item.pairedItem, source);
}
