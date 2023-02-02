import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject, INodeListSearchItems, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';

// tslint:disable-next-line:no-any
export function simplify(responseData: any | [any]) {
	const returnData = [];
	for (const {
		columnHeader: { dimensions, metricHeader },
		data: { rows },
	} of responseData) {
		if (rows === undefined) {
			// Do not error if there is no data
			continue;
		}
		const metrics = metricHeader.metricHeaderEntries.map((entry: { name: string }) => entry.name);
		for (const row of rows) {
			const rowDimensions: IDataObject = {};
			const rowMetrics: IDataObject = {};
			if (dimensions) {
				for (let i = 0; i < dimensions.length; i++) {
					rowDimensions[dimensions[i]] = row.dimensions[i];
					for (const [index, metric] of metrics.entries()) {
						rowMetrics[metric] = row.metrics[0].values[index];
					}
				}
			} else {
				for (const [index, metric] of metrics.entries()) {
					rowMetrics[metric] = row.metrics[0].values[index];
				}
			}
			returnData.push({ ...rowDimensions, ...rowMetrics });
		}
	}

	return returnData;
}

// tslint:disable-next-line:no-any
export function merge(responseData: [any]) {
	const response: { columnHeader: IDataObject; data: { rows: [] } } = {
		columnHeader: responseData[0].columnHeader,
		data: responseData[0].data,
	};
	const allRows = [];
	for (const {
		data: { rows },
	} of responseData) {
		allRows.push(...rows);
	}
	response.data.rows = allRows as [];
	return [response];
}

export function simplifyGA4(response: IDataObject) {
	if (!response.rows) return [];
	const dimensionHeaders = ((response.dimensionHeaders as IDataObject[]) || []).map(
		(header) => header.name as string,
	);
	const metricHeaders = ((response.metricHeaders as IDataObject[]) || []).map(
		(header) => header.name as string,
	);
	const returnData: IDataObject[] = [];

	(response.rows as IDataObject[]).forEach((row) => {
		if (!row) return;
		const rowDimensions: IDataObject = {};
		const rowMetrics: IDataObject = {};
		dimensionHeaders.forEach((dimension, index) => {
			rowDimensions[dimension] = (row.dimensionValues as IDataObject[])[index].value;
		});
		metricHeaders.forEach((metric, index) => {
			rowMetrics[metric] = (row.metricValues as IDataObject[])[index].value;
		});
		returnData.push({ ...rowDimensions, ...rowMetrics });
	});

	return returnData;
}

export function processFilters(expression: IDataObject): IDataObject[] {
	const processedFilters: IDataObject[] = [];

	Object.entries(expression).forEach((entry) => {
		const [filterType, filters] = entry;

		(filters as IDataObject[]).forEach((filter) => {
			let fieldName = '';
			switch (filter.listName) {
				case 'other':
					fieldName = filter.name as string;
					delete filter.name;
					break;
				case 'custom':
					fieldName = filter.name as string;
					delete filter.name;
					break;
				default:
					fieldName = filter.listName as string;
			}
			delete filter.listName;

			if (filterType === 'inListFilter') {
				filter.values = (filter.values as string).split(',');
			}

			if (filterType === 'numericFilter') {
				filter.value = {
					[filter.valueType as string]: filter.value,
				};
				delete filter.valueType;
			}

			if (filterType === 'betweenFilter') {
				filter.fromValue = {
					[filter.valueType as string]: filter.fromValue,
				};
				filter.toValue = {
					[filter.valueType as string]: filter.toValue,
				};
				delete filter.valueType;
			}

			processedFilters.push({
				filter: {
					fieldName,
					[filterType]: filter,
				},
			});
		});
	});

	return processedFilters;
}

export function prepareDateRange(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	period: string,
	itemIndex: number,
) {
	const dateRanges: IDataObject[] = [];

	switch (period) {
		case 'today':
			dateRanges.push({
				startDate: DateTime.local().startOf('day').toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'yesterday':
			dateRanges.push({
				startDate: DateTime.local().startOf('day').minus({ days: 1 }).toISODate(),
				endDate: DateTime.local().endOf('day').minus({ days: 1 }).toISODate(),
			});
			break;
		case 'lastCalendarWeek':
			const begginingOfLastWeek = DateTime.local().startOf('week').minus({ weeks: 1 }).toISODate();
			const endOfLastWeek = DateTime.local().endOf('week').minus({ weeks: 1 }).toISODate();
			dateRanges.push({
				startDate: begginingOfLastWeek,
				endDate: endOfLastWeek,
			});
			break;
		case 'lastCalendarMonth':
			const begginingOfLastMonth = DateTime.local()
				.startOf('month')
				.minus({ months: 1 })
				.toISODate();
			const endOfLastMonth = DateTime.local().endOf('month').minus({ months: 1 }).toISODate();
			dateRanges.push({
				startDate: begginingOfLastMonth,
				endDate: endOfLastMonth,
			});
			break;
		case 'last7days':
			dateRanges.push({
				startDate: DateTime.now().minus({ days: 7 }).toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'last30days':
			dateRanges.push({
				startDate: DateTime.now().minus({ days: 30 }).toISODate(),
				endDate: DateTime.now().toISODate(),
			});
			break;
		case 'custom':
			const start = DateTime.fromISO(this.getNodeParameter('startDate', itemIndex, '') as string);
			const end = DateTime.fromISO(this.getNodeParameter('endDate', itemIndex, '') as string);

			if (start > end) {
				throw new NodeOperationError(
					this.getNode(),
					`Parameter Start: ${start.toISO()} cannot be after End: ${end.toISO()}`,
				);
			}

			dateRanges.push({
				startDate: start.toISODate(),
				endDate: end.toISODate(),
			});

			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The period '${period}' is not supported, to specify own period use 'custom' option`,
			);
	}

	return dateRanges;
}

export const defaultStartDate = () => DateTime.now().startOf('day').minus({ days: 8 }).toISO();

export const defaultEndDate = () => DateTime.now().startOf('day').minus({ days: 1 }).toISO();

export function checkDuplicates(
	this: IExecuteFunctions,
	data: IDataObject[],
	key: string,
	type: string,
) {
	const fields = data.map((item) => item[key] as string);
	const duplicates = fields.filter((field, i) => fields.indexOf(field) !== i);
	const unique = Array.from(new Set(duplicates));
	if (unique.length) {
		throw new NodeOperationError(
			this.getNode(),
			`A ${type} is specified more than once (${unique.join(', ')})`,
		);
	}
}

export function sortLoadOptions(data: INodePropertyOptions[] | INodeListSearchItems[]) {
	const returnData = [...data];
	returnData.sort((a, b) => {
		const aName = a.name.toLowerCase();
		const bName = b.name.toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return returnData;
}
