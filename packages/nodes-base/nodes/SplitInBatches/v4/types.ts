import type { INodeExecutionData, ISourceData } from 'n8n-workflow';

export type SplitInBatchesContext = {
	items: INodeExecutionData[];
	processedItems: INodeExecutionData[];
	currentRunIndex: number;
	sourceData: ISourceData;
	noItemsLeft: boolean;
	done: boolean;
};
