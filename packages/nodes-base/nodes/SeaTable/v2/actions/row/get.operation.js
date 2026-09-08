import { updateDisplayOptions, } from 'n8n-workflow';
import { seaTableApiRequest, enrichColumns, escapeSqlIdentifier, escapeSqlString, simplify_new, getBaseCollaborators, } from '../../GenericFunctions';
export const properties = [
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
            {
                displayName: 'Simplify',
                name: 'simple',
                type: 'boolean',
                default: true,
                description: 'Whether to return a simplified version of the response instead of the raw data',
            },
            {
                displayName: 'Return Column Names',
                name: 'convert',
                type: 'boolean',
                default: true,
                description: 'Whether to return the column keys (false) or the column names (true)',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['row'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    // get parameters
    const tableName = this.getNodeParameter('tableName', index);
    const rowId = this.getNodeParameter('rowId', index);
    const options = this.getNodeParameter('options', index);
    // get collaborators
    const collaborators = await getBaseCollaborators.call(this);
    // get rows
    const sqlResult = (await seaTableApiRequest.call(this, {}, 'POST', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/sql/', {
        sql: `SELECT * FROM \`${escapeSqlIdentifier(tableName)}\` WHERE _id = '${escapeSqlString(rowId)}'`,
        convert_keys: options.convert ?? true,
    }));
    const metadata = sqlResult.metadata;
    const rows = sqlResult.results;
    // hide columns like button
    rows.map((row) => enrichColumns(row, metadata, collaborators));
    const simple = options.simple ?? true;
    // remove columns starting with _ if simple;
    if (simple) {
        rows.map((row) => simplify_new(row));
    }
    return this.helpers.returnJsonArray(rows);
}
//# sourceMappingURL=get.operation.js.map