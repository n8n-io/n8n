export type DataStoreColumnType = 'string' | 'number' | 'boolean' | 'date';

export type DataStoreColumn = {
	id: string;
	name: string;
	type: DataStoreColumnType;
	columnIndex: number;
	dataStoreId: string;
};

export type DataStore = {
	id: string;
	name: string;
	columns: DataStoreColumn[];
	createdAt: Date;
	updatedAt: Date;
	projectId: string;
	sizeBytes: number;
};

export type CreateDataStoreColumnPayload = Pick<DataStoreColumn, 'name' | 'type'> &
	Partial<Pick<DataStoreColumn, 'columnIndex'>>;

export type CreateDataStorePayload = Pick<DataStore, 'name'> & {
	columns: CreateDataStoreColumnPayload[];
};

export type UpdateDataStorePayload = { name: string };

export type ListDataStoreOptions = {
	filter?: Record<string, string | string[]>;
	sortBy?:
		| 'name:asc'
		| 'name:desc'
		| 'createdAt:asc'
		| 'createdAt:desc'
		| 'updatedAt:asc'
		| 'updatedAt:desc'
		| 'sizeBytes:asc'
		| 'sizeBytes:desc';
	take?: number;
	skip?: number;
};

export type ListDataStoreContentFilter = {
	type: 'and' | 'or';
	filters: Array<{
		columnName: string;
		condition: 'eq' | 'neq';
		value: string | number | boolean | Date;
	}>;
};

export type ListDataStoreRowsOptions = {
	filter?: ListDataStoreContentFilter;
	sortBy?: [string, 'ASC' | 'DESC'];
	take?: number;
	skip?: number;
};

export type MoveDataStoreColumn = {
	targetIndex: number;
};

export type DeleteDataStoreColumn = {
	columnId: string;
};

export type DataStoreColumnJsType = string | number | boolean | Date;

export type DataStoreRows = Array<Record<PropertyKey, DataStoreColumnJsType | null>>;

// API for a data store service operating on a specific projectId
export interface IDataStoreProjectService {
	// createDataStore(dto: CreateDataStorePayload): Promise<DataStore>;
	// updateDataStore(dto: UpdateDataStorePayload): Promise<boolean>;
	getManyAndCount(options: ListDataStoreOptions): Promise<{ count: number; data: DataStore[] }>;

	// deleteDataStoreAll(): Promise<boolean>;
	// deleteDataStore(dataStoreId: string): Promise<boolean>;

	getColumns(): Promise<DataStoreColumn[]>;
	// addColumn(dto: CreateDataStoreColumnPayload): Promise<DataStoreColumn>;
	// moveColumn(columnId: string, dto: MoveDataStoreColumn): Promise<boolean>;
	// deleteColumn(dto: DeleteDataStoreColumn): Promise<boolean>;

	getManyRowsAndCount(
		dto: Partial<ListDataStoreRowsOptions>,
	): Promise<{ count: number; data: DataStoreRows }>;
	appendRows(rows: DataStoreRows): Promise<boolean>;
}
