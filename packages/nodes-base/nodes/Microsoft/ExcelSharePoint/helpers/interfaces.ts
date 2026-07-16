import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// Used as `this` by every helper in this node (credential resolution, error
// mapping, the request itself), so it earns a shared home unlike the other
// types here, which each live next to their one real consumer.
export type AuthContext = IExecuteFunctions | ILoadOptionsFunctions;

// Shape of a Graph collection response (worksheets, tables, …): a page of
// items plus an optional next-page link. Shared by every caller that lists
// and paginates a workbook-rooted collection.
export interface GraphListResponse extends IDataObject {
	value?: IDataObject[];
	'@odata.nextLink'?: string;
}
