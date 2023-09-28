import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	itemList:
		| 'concatenateItems'
		| 'limit'
		| 'manageBinaries'
		| 'removeDuplicates'
		| 'sort'
		| 'splitOutItems'
		| 'summarize';
};

export type ItemListsType = AllEntities<NodeMap>;
