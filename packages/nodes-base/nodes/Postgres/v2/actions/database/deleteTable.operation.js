import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { addWhereClauses, getWhereClauses } from '../../helpers/utils';
import { combineConditionsCollection, optionsCollection, whereFixedCollection, } from '../common.descriptions';
const properties = [
    {
        displayName: 'Command',
        name: 'deleteCommand',
        type: 'options',
        default: 'truncate',
        options: [
            {
                name: 'Truncate',
                value: 'truncate',
                description: "Only removes the table's data and preserves the table's structure",
            },
            {
                name: 'Delete',
                value: 'delete',
                description: "Delete the rows that match the 'Select Rows' conditions below. If no selection is made, all rows in the table are deleted.",
            },
            {
                name: 'Drop',
                value: 'drop',
                description: "Deletes the table's data and also the table's structure permanently",
            },
        ],
    },
    {
        displayName: 'Restart Sequences',
        name: 'restartSequences',
        type: 'boolean',
        default: false,
        description: 'Whether to reset identity (auto-increment) columns to their initial values',
        displayOptions: {
            show: {
                deleteCommand: ['truncate'],
            },
        },
    },
    {
        ...whereFixedCollection,
        displayOptions: {
            show: {
                deleteCommand: ['delete'],
            },
        },
    },
    {
        ...combineConditionsCollection,
        displayOptions: {
            show: {
                deleteCommand: ['delete'],
            },
        },
    },
    optionsCollection,
];
const displayOptions = {
    show: {
        resource: ['database'],
        operation: ['deleteTable'],
    },
    hide: {
        table: [''],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(runQueries, items, nodeOptions, _db) {
    const queries = [];
    for (let i = 0; i < items.length; i++) {
        const options = this.getNodeParameter('options', i, {});
        const schema = this.getNodeParameter('schema', i, undefined, {
            extractValue: true,
        });
        const table = this.getNodeParameter('table', i, undefined, {
            extractValue: true,
        });
        const deleteCommand = this.getNodeParameter('deleteCommand', i);
        let query = '';
        let values = [schema, table];
        if (deleteCommand === 'drop') {
            const cascade = options.cascade ? ' CASCADE' : '';
            query = `DROP TABLE IF EXISTS $1:name.$2:name${cascade}`;
        }
        if (deleteCommand === 'truncate') {
            const identity = this.getNodeParameter('restartSequences', i, false)
                ? ' RESTART IDENTITY'
                : '';
            const cascade = options.cascade ? ' CASCADE' : '';
            query = `TRUNCATE TABLE $1:name.$2:name${identity}${cascade}`;
        }
        if (deleteCommand === 'delete') {
            const whereClauses = getWhereClauses(this, i);
            const combineConditions = this.getNodeParameter('combineConditions', i, 'AND');
            [query, values] = addWhereClauses(this.getNode(), i, 'DELETE FROM $1:name.$2:name', whereClauses, values, combineConditions);
        }
        if (query === '') {
            throw new NodeOperationError(this.getNode(), 'Invalid delete command, only drop, delete and truncate are supported ', { itemIndex: i });
        }
        const queryWithValues = { query, values };
        queries.push(queryWithValues);
    }
    return await runQueries(queries, nodeOptions);
}
//# sourceMappingURL=deleteTable.operation.js.map