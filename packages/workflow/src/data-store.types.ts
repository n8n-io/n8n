export type DataStoreColumnType = 'string' | 'number' | 'boolean' | 'date';

export type DataStoreColumn = {
	id: string;
	name: string;
	type: DataStoreColumnType;
	index: number;
	dataTableId: string;
};

export type DataStore = {
	id: string;
	name: string;
	columns: DataStoreColumn[];
	createdAt: Date;
	updatedAt: Date;
	projectId: string;
};

export type CreateDataStoreColumnOptions = Pick<DataStoreColumn, 'name' | 'type'> &
	Partial<Pick<DataStoreColumn, 'index'>>;

export type CreateDataStoreOptions = Pick<DataStore, 'name'> & {
	columns: CreateDataStoreColumnOptions[];
};

export type UpdateDataStoreOptions = { name: string };

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
		value: DataStoreColumnJsType;
	}>;
};

export type ListDataStoreRowsOptions = {
	filter?: ListDataStoreContentFilter;
	sortBy?: [string, 'ASC' | 'DESC'];
	take?: number;
	skip?: number;
};

export type UpdateDataStoreRowsOptions = {
	filter: Record<string, DataStoreColumnJsType>;
	data: DataStoreRow;
};

export type UpsertDataStoreRowsOptions = {
	rows: DataStoreRows;
	matchFields: string[];
};

export type MoveDataStoreColumnOptions = {
	targetIndex: number;
};

export type AddDataStoreColumnOptions = Pick<DataStoreColumn, 'name' | 'type'> &
	Partial<Pick<DataStoreColumn, 'index'>>;

export type DataStoreColumnJsType = string | number | boolean | Date | null;

export const DATA_TABLE_SYSTEM_COLUMNS = ['id', 'createdAt', 'updatedAt'] as const;

export type DataStoreRowReturnBase = {
	id: number;
	createdAt: Date;
	updatedAt: Date;
};
export type DataStoreRow = Record<string, DataStoreColumnJsType>;
export type DataStoreRows = DataStoreRow[];
export type DataStoreRowReturn = DataStoreRow & DataStoreRowReturnBase;
export type DataStoreRowsReturn = DataStoreRowReturn[];

// APIs for a data store service operating on a specific projectId
export interface IDataStoreProjectAggregateService {
	getProjectId(): string;

	createDataStore(options: CreateDataStoreOptions): Promise<DataStore>;

	getManyAndCount(options: ListDataStoreOptions): Promise<{ count: number; data: DataStore[] }>;

	deleteDataStoreAll(): Promise<boolean>;
}
// APIs for a data store service operating on a specific projectId and dataStoreId
export interface IDataStoreProjectService {
	updateDataStore(options: UpdateDataStoreOptions): Promise<boolean>;

	deleteDataStore(): Promise<boolean>;

	getColumns(): Promise<DataStoreColumn[]>;

	addColumn(options: AddDataStoreColumnOptions): Promise<DataStoreColumn>;

	moveColumn(columnId: string, options: MoveDataStoreColumnOptions): Promise<boolean>;

	deleteColumn(columnId: string): Promise<boolean>;

	getManyRowsAndCount(
		dto: Partial<ListDataStoreRowsOptions>,
	): Promise<{ count: number; data: DataStoreRowsReturn }>;

	insertRows(rows: DataStoreRows): Promise<DataStoreRowReturn[]>;

	updateRows(options: UpdateDataStoreRowsOptions): Promise<DataStoreRowReturn[]>;

	upsertRows(options: UpsertDataStoreRowsOptions): Promise<DataStoreRowReturn[]>;

	deleteRows(ids: number[]): Promise<boolean>;
}
