import { DateTime } from 'luxon';
import { NodeOperationError } from 'n8n-workflow';
// tslint:disable-next-line:no-any
export function simplify(responseData) {
    const returnData = [];
    for (const { columnHeader: { dimensions, metricHeader }, data: { rows }, } of responseData) {
        if (rows === undefined) {
            // Do not error if there is no data
            continue;
        }
        const metrics = metricHeader.metricHeaderEntries.map((entry) => entry.name);
        for (const row of rows) {
            const rowDimensions = {};
            const rowMetrics = {};
            if (dimensions) {
                for (let i = 0; i < dimensions.length; i++) {
                    rowDimensions[dimensions[i]] = row.dimensions[i];
                    for (const [index, metric] of metrics.entries()) {
                        rowMetrics[metric] = row.metrics[0].values[index];
                    }
                }
            }
            else {
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
export function merge(responseData) {
    const response = {
        columnHeader: responseData[0].columnHeader,
        data: responseData[0].data,
    };
    const allRows = [];
    for (const { data: { rows }, } of responseData) {
        allRows.push(...rows);
    }
    response.data.rows = allRows;
    return [response];
}
export function simplifyGA4(response) {
    if (!response.rows)
        return [];
    const dimensionHeaders = (response.dimensionHeaders || []).map((header) => header.name);
    const metricHeaders = (response.metricHeaders || []).map((header) => header.name);
    const returnData = [];
    response.rows.forEach((row) => {
        if (!row)
            return;
        const rowDimensions = {};
        const rowMetrics = {};
        dimensionHeaders.forEach((dimension, index) => {
            rowDimensions[dimension] = row.dimensionValues[index].value;
        });
        metricHeaders.forEach((metric, index) => {
            rowMetrics[metric] = row.metricValues[index].value;
        });
        returnData.push({ ...rowDimensions, ...rowMetrics });
    });
    return returnData;
}
export function processFilters(expression) {
    const processedFilters = [];
    Object.entries(expression).forEach((entry) => {
        const [filterType, filters] = entry;
        filters.forEach((filter) => {
            let fieldName = '';
            switch (filter.listName) {
                case 'other':
                    fieldName = filter.name;
                    delete filter.name;
                    break;
                case 'custom':
                    fieldName = filter.name;
                    delete filter.name;
                    break;
                default:
                    fieldName = filter.listName;
            }
            delete filter.listName;
            if (filterType === 'inListFilter') {
                filter.values = filter.values.split(',');
            }
            if (filterType === 'numericFilter') {
                filter.value = {
                    [filter.valueType]: filter.value,
                };
                delete filter.valueType;
            }
            if (filterType === 'betweenFilter') {
                filter.fromValue = {
                    [filter.valueType]: filter.fromValue,
                };
                filter.toValue = {
                    [filter.valueType]: filter.toValue,
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
export function prepareDateRange(period, itemIndex) {
    const dateRanges = [];
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
            const start = DateTime.fromISO(this.getNodeParameter('startDate', itemIndex, ''));
            const end = DateTime.fromISO(this.getNodeParameter('endDate', itemIndex, ''));
            if (start > end) {
                throw new NodeOperationError(this.getNode(), `Parameter Start: ${start.toISO()} cannot be after End: ${end.toISO()}`);
            }
            dateRanges.push({
                startDate: start.toISODate(),
                endDate: end.toISODate(),
            });
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The period '${period}' is not supported, to specify own period use 'custom' option`);
    }
    return dateRanges;
}
export const defaultStartDate = () => DateTime.now().startOf('day').minus({ days: 8 }).toISO();
export const defaultEndDate = () => DateTime.now().startOf('day').minus({ days: 1 }).toISO();
export function checkDuplicates(data, key, type) {
    const fields = data.map((item) => item[key]);
    const duplicates = fields.filter((field, i) => fields.indexOf(field) !== i);
    const unique = Array.from(new Set(duplicates));
    if (unique.length) {
        throw new NodeOperationError(this.getNode(), `A ${type} is specified more than once (${unique.join(', ')})`);
    }
}
export function sortLoadOptions(data) {
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
//# sourceMappingURL=utils.js.map