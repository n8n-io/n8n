import { tryToParseNumber, } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { addSortRules, addWhereClauses, getWhereClauses, replaceEmptyStringsByNulls, } from '../../helpers/utils';
import { combineConditionsCollection, optionsCollection, sortFixedCollection, whereFixedCollection, } from '../common.descriptions';
const properties = [
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        default: false,
        description: 'Whether to return all results or only up to a given limit',
        displayOptions: {
            show: {
                resource: ['event'],
                operation: ['getAll'],
            },
        },
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 50,
        description: 'Max number of results to return',
        typeOptions: {
            minValue: 1,
        },
        displayOptions: {
            show: {
                returnAll: [false],
            },
        },
    },
    whereFixedCollection,
    combineConditionsCollection,
    sortFixedCollection,
    optionsCollection,
];
const displayOptions = {
    show: {
        resource: ['database'],
        operation: ['select'],
    },
    hide: {
        table: [''],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(runQueries, items, nodeOptions, _db) {
    items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings);
    const queries = [];
    for (let i = 0; i < items.length; i++) {
        const schema = this.getNodeParameter('schema', i, undefined, {
            extractValue: true,
        });
        const table = this.getNodeParameter('table', i, undefined, {
            extractValue: true,
        });
        let values = [schema, table];
        const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']);
        let query = '';
        if (outputColumns.includes('*')) {
            query = 'SELECT * FROM $1:name.$2:name';
        }
        else {
            values.push(outputColumns);
            query = `SELECT $${values.length}:name FROM $1:name.$2:name`;
        }
        const whereClauses = getWhereClauses(this, i);
        const combineConditions = this.getNodeParameter('combineConditions', i, 'AND');
        [query, values] = addWhereClauses(this.getNode(), i, query, whereClauses, values, combineConditions);
        const sortRules = this.getNodeParameter('sort', i, []).values || [];
        [query, values] = addSortRules(query, sortRules, values);
        const returnAll = this.getNodeParameter('returnAll', i, false);
        if (!returnAll) {
            const limitRaw = this.getNodeParameter('limit', i, 50);
            const limit = tryToParseNumber(limitRaw);
            values.push(limit);
            query += ` LIMIT $${values.length}`;
        }
        const queryWithValues = { query, values };
        queries.push(queryWithValues);
    }
    return await runQueries(queries, nodeOptions);
}
//# sourceMappingURL=select.operation.js.map