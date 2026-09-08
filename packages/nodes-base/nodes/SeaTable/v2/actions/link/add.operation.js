import { updateDisplayOptions, } from 'n8n-workflow';
import { seaTableApiRequest } from '../../GenericFunctions';
export const properties = [
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
        displayName: 'Table Name (Source)',
        name: 'tableName',
        type: 'options',
        placeholder: 'Name of table',
        required: true,
        typeOptions: {
            loadOptionsMethod: 'getTableNameAndId',
        },
        default: '',
        // eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
        description: 'Choose from the list, of specify by using an expression. Provide it in the way "table_name:::table_id".',
    },
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
        displayName: 'Link Column',
        name: 'linkColumn',
        type: 'options',
        typeOptions: {
            loadOptionsDependsOn: ['tableName'],
            loadOptionsMethod: 'getLinkColumns',
        },
        required: true,
        default: '',
        // eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
        description: 'Choose from the list of specify the Link Column by using an expression. You have to provide it in the way "column_name:::link_id:::other_table_id".',
    },
    {
        displayName: 'Row ID From the Source Table',
        name: 'linkColumnSourceId',
        type: 'string',
        required: true,
        default: '',
        description: 'Provide the row ID of table you selected',
    },
    {
        displayName: 'Row ID From the Target',
        name: 'linkColumnTargetId',
        type: 'string',
        required: true,
        default: '',
        description: 'Provide the row ID of table you want to link',
    },
];
const displayOptions = {
    show: {
        resource: ['link'],
        operation: ['add'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const tableName = this.getNodeParameter('tableName', index);
    const linkColumn = this.getNodeParameter('linkColumn', index);
    const linkColumnSourceId = this.getNodeParameter('linkColumnSourceId', index);
    const linkColumnTargetId = this.getNodeParameter('linkColumnTargetId', index);
    const body = {
        link_id: linkColumn.split(':::')[1],
        table_id: tableName.split(':::')[1],
        other_table_id: linkColumn.split(':::')[2],
        other_rows_ids_map: {
            [linkColumnSourceId]: [linkColumnTargetId],
        },
    };
    const responseData = await seaTableApiRequest.call(this, {}, 'POST', '/api-gateway/api/v2/dtables/{{dtable_uuid}}/links/', body);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=add.operation.js.map