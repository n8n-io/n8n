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
	| '_child'
	| '_type'
	| '_string'
	| '_like'
	| '_wildcard';
export type IQueryObject = {
	[key in queryIndexSignature]?: IQueryObject | IQueryObject[] | string | number | object;
};

// Query Functions

export function Eq(field: string, value: any): IQueryObject {
	return { _field: field, _value: value };
}

export function Gt(_field: string, value: any): IQueryObject {
	return { _gt: { field: value } };
}

export function Gte(_field: string, value: any): IQueryObject {
	return { _gte: { field: value } };
}

export function Lt(_field: string, value: any): IQueryObject {
	return { _lt: { field: value } };
}

export function Lte(_field: string, value: any): IQueryObject {
	return { _lte: { field: value } };
}
export function And(...criteria: IQueryObject[]): IQueryObject {
	return { _and: criteria };
}
export function Or(...criteria: IQueryObject[]): IQueryObject {
	return { _or: criteria };
}
export function Not(criteria: IQueryObject[]): IQueryObject {
	return { _not: criteria };
}

export function In(field: string, values: any[]): IQueryObject {
	return { _in: { _field: field, _values: values } };
}
export function Contains(field: string): IQueryObject {
	return { _contains: field };
}
export function Id(id: string | number): IQueryObject {
	return { _id: id };
}

export function Between(field: string, fromValue: any, toValue: any): IQueryObject {
	return { _between: { _field: field, _from: fromValue, _to: toValue } };
}
export function ParentId(tpe: string, id: string): IQueryObject {
	return { _parent: { _type: tpe, _id: id } };
}
export function Parent(tpe: string, criterion: IQueryObject): IQueryObject {
	return { _parent: { _type: tpe, _query: criterion } };
}
export function Child(tpe: string, criterion: IQueryObject): IQueryObject {
	return { _child: { _type: tpe, _query: criterion } };
}
export function Type(tpe: string): IQueryObject {
	return { _type: tpe };
}
export function queryString(query: string): IQueryObject {
	return { _string: query };
}
export function Like(field: string, value: string): IQueryObject {
	return { _like: { _field: field, _value: value } };
}
export function StartsWith(field: string, value: string) {
	if (!value.startsWith('*')) {
		value = value + '*';
	}
	return { _wildcard: { _field: field, _value: value } };
}
export function EndsWith(field: string, value: string) {
	if (!value.endsWith('*')) {
		value = '*' + value;
	}
	return { _wildcard: { _field: field, _value: value } };
}
export function ContainsString(field: string, value: string) {
	if (!value.endsWith('*')) {
		value = value + '*';
	}
	if (!value.startsWith('*')) {
		value = '*' + value;
	}
	return { _wildcard: { _field: field, _value: value } };
}
