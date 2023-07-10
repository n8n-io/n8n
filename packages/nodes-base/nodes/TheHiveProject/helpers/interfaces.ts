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

export type QueryScope = { query: string; id?: string; restrictTo?: string };
