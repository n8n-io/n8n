export type OperationType = 'simplify' | 'summarize' | 'reconfigure';

export type SimplifyOperation =
	| 'combineRows'
	| 'extractCell'
	| 'extractColumn'
	| 'extractRow'
	| 'removeDuplicates';

export type SummarizeOperation = 'countRowsAndColumns' | 'pivotColumns' | 'unpivotColumns';

export type ReconfigureOperation =
	| 'expandNestedFields'
	| 'flipTable'
	| 'sort'
	| 'splitColumn'
	| 'updateColumnHeaders';
