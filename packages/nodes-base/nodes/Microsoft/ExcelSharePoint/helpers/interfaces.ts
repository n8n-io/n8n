import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// Used as `this` by every helper in this node (credential resolution, error
// mapping, the request itself), so it earns a shared home unlike the other
// types here, which each live next to their one real consumer.
export type AuthContext = IExecuteFunctions | ILoadOptionsFunctions;

// Shape of a Graph collection response (worksheets, tables, …): a page of
// items plus an optional next-page link. Shared by every caller that lists
// and paginates a workbook-rooted collection.
export interface GraphListResponse<T extends IDataObject = IDataObject> extends IDataObject {
	value?: T[];
	'@odata.nextLink'?: string;
}

// The bound the dropdown search helper (listSearchPage) filters and maps
// on: every collection it lists (worksheets, tables) is Graph-identified by
// id and name.
export interface NamedGraphItem extends IDataObject {
	id: string;
	name: string;
}

/** https://learn.microsoft.com/en-us/graph/api/resources/workbookworksheet */
export interface GraphWorksheet extends NamedGraphItem {
	position?: number;
	visibility?: 'Visible' | 'Hidden' | 'VeryHidden';
}

/** https://learn.microsoft.com/en-us/graph/api/resources/workbooktable */
export interface GraphTable extends NamedGraphItem {
	showHeaders?: boolean;
	showTotals?: boolean;
	style?: string;
	highlightFirstColumn?: boolean;
	highlightLastColumn?: boolean;
	showBandedColumns?: boolean;
	showBandedRows?: boolean;
	showFilterButton?: boolean;
	legacyId?: string;
}
