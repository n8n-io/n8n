import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { addSortRules, addWhereClauses, escapeSqlIdentifier, getWhereClauses, prepareErrorItem, } from '../../helpers/utils';
import { optionsCollection, sortFixedCollection, selectRowsFixedCollection, combineConditionsCollection, } from '../common.descriptions';
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
    selectRowsFixedCollection,
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
export async function execute(inputItems, runQueries) {
    let returnData = [];
    const queries = [];
    for (let i = 0; i < inputItems.length; i++) {
        try {
            const table = this.getNodeParameter('table', i, undefined, {
                extractValue: true,
            });
            const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']);
            const selectDistinct = this.getNodeParameter('options.selectDistinct', i, false);
            let query = '';
            const SELECT = selectDistinct ? 'SELECT DISTINCT' : 'SELECT';
            if (outputColumns.includes('*')) {
                query = `${SELECT} * FROM ${escapeSqlIdentifier(table)}`;
            }
            else {
                const escapedColumns = outputColumns.map(escapeSqlIdentifier).join(', ');
                query = `${SELECT} ${escapedColumns} FROM ${escapeSqlIdentifier(table)}`;
            }
            let values = [];
            const whereClauses = getWhereClauses(this, i);
            const combineConditions = this.getNodeParameter('combineConditions', i, 'AND');
            [query, values] = addWhereClauses(this.getNode(), i, query, whereClauses, values, combineConditions);
            const sortRules = this.getNodeParameter('sort', i, []).values || [];
            [query, values] = addSortRules(query, sortRules, values);
            const returnAll = this.getNodeParameter('returnAll', i, false);
            if (!returnAll) {
                const limit = this.getNodeParameter('limit', i, 50);
                query += ' LIMIT ?';
                values.push(limit);
            }
            queries.push({ query, values, itemIndex: i });
        }
        catch (error) {
            if (!this.continueOnFail())
                throw error;
            const nodeError = error instanceof NodeOperationError
                ? error
                : new NodeOperationError(this.getNode(), error, { itemIndex: i });
            returnData.push(prepareErrorItem(inputItems[i].json, nodeError, i));
        }
    }
    if (queries.length > 0) {
        returnData = returnData.concat(await runQueries(queries));
    }
    return returnData;
}
//# sourceMappingURL=select.operation.js.map