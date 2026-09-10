export type DataTableColumnType = 'string' | 'number' | 'boolean' | 'date' | 'enum';
export type DataTableEnumOption = {
	id: string;
	text: string;
	color: string;
};

export type DataTableEnumValue = {
	id: string;
	value: string;
	color: string;
};

/**
 * Data Table row operations
 * Used by the Data Table node (n8n-nodes-base.dataTable) for row-level CRUD operations
 */
export type DataTableRowOperation =
	| 'insert'
	| 'get'
	| 'rowExists'
	| 'rowNotExists'
	| 'deleteRows'
	| 'update'
	| 'upsert';

/**
 * Data Table table operations
 * Used by the Data Table node for table-level management operations
 */
export type DataTableTableOperation = 'create' | 'delete' | 'list' | 'update' | 'clear';

export type DataTableColumn = {
	id: string;
	name: string;
	type: DataTableColumnType;
	index: number;
	dataTableId: string;
	options?: DataTableEnumOption[] | null;
	defaultValue?: string | null;
};

export type DataTableMetadata = Record<string, unknown>;

export type DataTable = {
	id: string;
	name: string;
	columns: DataTableColumn[];
	metadata: DataTableMetadata;
	createdAt: Date;
	updatedAt: Date;
	projectId: string;
};

export type CreateDataTableColumnOptions = Pick<DataTableColumn, 'name' | 'type'> & {
	index?: number;
	options?: Array<string | { id?: string; text: string; color?: string }>;
	defaultValue?: string;
};

export type CreateDataTableOptions = Pick<DataTable, 'name'> & {
	columns: CreateDataTableColumnOptions[];
};

export type UpdateDataTableOptions = { name: string };

export type ListDataTableOptionsSortByKey = 'name' | 'createdAt' | 'updatedAt';

export type ListDataTableOptions = {
	filter?: Record<string, string | string[]>;
	sortBy?: `${ListDataTableOptionsSortByKey}:asc` | `${ListDataTableOptionsSortByKey}:desc`;
	take?: number;
	skip?: number;
};

export type DataTableFilter = {
	type: 'and' | 'or';
	filters: Array<{
		columnName: string;
		condition: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
		value: DataTableColumnJsType;
	}>;
};

export type ListDataTableRowsOptions = {
	filter?: DataTableFilter;
	sortBy?: [string, 'ASC' | 'DESC'];
	take?: number;
	skip?: number;
};

export type UpdateDataTableRowOptions = {
	filter: DataTableFilter;
	data: DataTableRow;
	dryRun?: boolean;
};

export type UpsertDataTableRowOptions = {
	filter: DataTableFilter;
	data: DataTableRow;
	dryRun?: boolean;
};

export type DeleteDataTableRowsOptions = {
	filter: DataTableFilter;
	dryRun?: boolean;
};

export type MoveDataTableColumnOptions = {
	targetIndex: number;
};

export type AddDataTableColumnOptions = CreateDataTableColumnOptions;

export type DataTableColumnJsType = string | number | boolean | Date | null;
export type DataTableColumnReturnJsType = DataTableColumnJsType | DataTableEnumValue;

export type DataTableTriggerEvent = 'rowInserted' | 'rowDeleted' | 'columnUpdated';

export type DataTableTriggerChange = {
	columnId: string;
	columnName: string;
	before: DataTableColumnReturnJsType;
	after: DataTableColumnReturnJsType;
};

export type DataTableTriggerOutput = {
	eventId: string;
	event: DataTableTriggerEvent;
	dataTableId: string;
	rowId: number;
	occurredAt: string;
	row: DataTableRowReturn;
	changes?: DataTableTriggerChange[];
};

export const DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP: Record<string, DataTableColumnType> = {
	id: 'number',
	createdAt: 'date',
	updatedAt: 'date',
};

export const DATA_TABLE_SYSTEM_COLUMNS = Object.keys(DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP);
export const DATA_TABLE_SYSTEM_TESTING_COLUMN = 'dryRunState';

// Raw database result type (before normalization)
export type DataTableRawRowReturnBase = {
	id: number;
	createdAt: string | number | Date;
	updatedAt: string | number | Date;
};

export type DataTableRowReturnBase = {
	id: number;
	createdAt: Date;
	updatedAt: Date;
};

export type DataTableRow = Record<string, DataTableColumnJsType>;
export type DataTableRows = DataTableRow[];

// Raw database results (before normalization)
export type DataTableRawRowReturn = DataTableRow & DataTableRawRowReturnBase;
export type DataTableRawRowsReturn = DataTableRawRowReturn[];

export type DataTableRowReturn = Record<string, DataTableColumnReturnJsType> &
	DataTableRowReturnBase;
export type DataTableRowsReturn = DataTableRowReturn[];

export type DataTableRowReturnWithState = Record<string, DataTableColumnReturnJsType> & {
	id: number | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	dryRunState: 'before' | 'after';
};

export type DataTableRowUpdatePair = {
	before: DataTableRowReturn;
	after: DataTableRowReturn;
};

export type DataTableInsertRowsReturnType = 'all' | 'id' | 'count';
export type DataTableInsertRowsBulkResult = { success: true; insertedRows: number };
export type DataTableInsertRowsResult<
	T extends DataTableInsertRowsReturnType = DataTableInsertRowsReturnType,
> = T extends 'all'
	? DataTableRowReturn[]
	: T extends 'id'
		? Array<Pick<DataTableRowReturn, 'id'>>
		: DataTableInsertRowsBulkResult;

export type DataTableSizeStatus = 'ok' | 'warn' | 'error';

export type DataTableInfo = {
	id: string;
	name: string;
	projectId: string;
	projectName: string;
	sizeBytes: number;
};

export type DataTableInfoById = Record<string, DataTableInfo>;

export type DataTablesSizeData = {
	totalBytes: number;
	dataTables: DataTableInfoById;
};

export type DataTablesSizeResult = DataTablesSizeData & {
	quotaStatus: DataTableSizeStatus;
};

// APIs for a data table service operating on a specific projectId
export interface IDataTableProjectAggregateService {
	getProjectId(): string;

	createDataTable(options: CreateDataTableOptions): Promise<DataTable>;

	getManyAndCount(options: ListDataTableOptions): Promise<{ count: number; data: DataTable[] }>;

	deleteDataTableAll(): Promise<boolean>;
}
// APIs for a data table service operating on a specific projectId and dataTableId
export interface IDataTableProjectService {
	updateDataTable(options: UpdateDataTableOptions): Promise<boolean>;

	deleteDataTable(): Promise<boolean>;

	getColumns(): Promise<DataTableColumn[]>;

	addColumn(options: AddDataTableColumnOptions): Promise<DataTableColumn>;

	moveColumn(columnId: string, options: MoveDataTableColumnOptions): Promise<boolean>;

	deleteColumn(columnId: string): Promise<boolean>;

	getManyRowsAndCount(
		dto: Partial<ListDataTableRowsOptions>,
	): Promise<{ count: number; data: DataTableRowsReturn }>;

	insertRows<T extends DataTableInsertRowsReturnType>(
		rows: DataTableRows,
		returnType: T,
	): Promise<DataTableInsertRowsResult<T>>;

	updateRows(
		options: UpdateDataTableRowOptions,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[]>;

	upsertRow(
		options: UpsertDataTableRowOptions,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[]>;

	deleteRows(options: DeleteDataTableRowsOptions): Promise<DataTableRowReturn[]>;

	clearRows(): Promise<{ deletedCount: number }>;

	listenForChanges(
		event: DataTableTriggerEvent,
		columnId: string | null,
		handler: (payload: DataTableTriggerOutput) => void,
	): () => void;
}

/** Rows prefetched for one table. */
export type DataTableExpressionTable = {
	first?: DataTableRowReturn;
	last?: DataTableRowReturn;
	/** By row id. */
	row: Record<string, DataTableRowReturn>;
	/** By column, then by stringified column value, for `find()`. */
	matched: Record<string, Record<string, DataTableRowReturn>>;
};

/** Rows prefetched for `$datatable` expressions, by table name. */
export type DataTableExpressionRows = Record<string, DataTableExpressionTable>;

/** One table as an expression reads it: `matched` is replaced by the `find` call. */
export type DataTableExpressionAccessors = Omit<DataTableExpressionTable, 'matched'> & {
	find(criteria: Record<string, unknown>): DataTableRowReturn | undefined;
};

/** The read-only slice of the project services that `$datatable` expressions need. */
export type DataTableExpressionProxy = {
	tables: Pick<IDataTableProjectAggregateService, 'getManyAndCount'>;
	rows(dataTableId: string): Pick<IDataTableProjectService, 'getManyRowsAndCount'>;
};
