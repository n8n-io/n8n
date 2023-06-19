import type { IDataObject } from 'n8n-workflow';

export type BodyWithQuery = { query: [IDataObject] };

export const enum TLP {
	white,
	green,
	amber,
	red,
}

// Query types
export declare type queryIndexSignature =
	| '_field'
	| '_gt'
	| '_value'
	| '_gte'
	| '_lt'
	| '_lte'
	| '_and'
	| '_or'
	| '_not'
	| '_in'
	| '_contains'
	| '_id'
	| '_between'
	| '_parent'
	| '_parent'
	| '_child'
	| '_type'
	| '_string'
	| '_like'
	| '_wildcard';

export type IQueryObject = {
	[key in queryIndexSignature]?: IQueryObject | IQueryObject[] | string | number | object;
};
