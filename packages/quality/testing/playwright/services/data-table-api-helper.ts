import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export type DataTableColumnType = 'string' | 'number' | 'boolean' | 'date';

export interface DataTableColumnDefinition {
	name: string;
	type: DataTableColumnType;
}

export interface DataTableResponse {
	id: string;
	name: string;
	projectId: string;
	columns: Array<DataTableColumnDefinition & { id: string; index: number }>;
}

export interface DataTableRowsResponse {
	count: number;
	data: Array<Record<string, unknown>>;
}

/** The internal data table API, under a project. */
export class DataTableApiHelper {
	constructor(private api: ApiHelpers) {}

	async create(
		projectId: string,
		dataTable: { name: string; columns: DataTableColumnDefinition[] },
	): Promise<DataTableResponse> {
		const response = await this.api.request.post(`/rest/projects/${projectId}/data-tables`, {
			data: dataTable,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create data table: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async getRows(projectId: string, dataTableId: string): Promise<DataTableRowsResponse> {
		const response = await this.api.request.get(
			`/rest/projects/${projectId}/data-tables/${dataTableId}/rows`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to get data table rows: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}
}
