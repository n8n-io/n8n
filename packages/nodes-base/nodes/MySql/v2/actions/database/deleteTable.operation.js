import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { addWhereClauses, escapeSqlIdentifier, getWhereClauses, prepareErrorItem, } from '../../helpers/utils';
import { optionsCollection, selectRowsFixedCollection, combineConditionsCollection, } from '../common.descriptions';
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
        ...selectRowsFixedCollection,
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
export async function execute(inputItems, runQueries) {
    let returnData = [];
    const queries = [];
    for (let i = 0; i < inputItems.length; i++) {
        try {
            const table = this.getNodeParameter('table', i, undefined, {
                extractValue: true,
            });
            const deleteCommand = this.getNodeParameter('deleteCommand', i);
            let query = '';
            let values = [];
            if (deleteCommand === 'drop') {
                query = `DROP TABLE IF EXISTS ${escapeSqlIdentifier(table)}`;
            }
            if (deleteCommand === 'truncate') {
                query = `TRUNCATE TABLE ${escapeSqlIdentifier(table)}`;
            }
            if (deleteCommand === 'delete') {
                const whereClauses = getWhereClauses(this, i);
                const combineConditions = this.getNodeParameter('combineConditions', i, 'AND');
                [query, values] = addWhereClauses(this.getNode(), i, `DELETE FROM ${escapeSqlIdentifier(table)}`, whereClauses, values, combineConditions);
            }
            if (query === '') {
                throw new NodeOperationError(this.getNode(), 'Invalid delete command, only drop, delete and truncate are supported ', { itemIndex: i });
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
//# sourceMappingURL=deleteTable.operation.js.map