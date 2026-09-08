import { NodeApiError } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { stampItemIndexOnError } from '../../../../GenericFunctions';
import { microsoftApiRequestAllItemsSkip } from '../../transport';
import { tableRLC, workbookRLC, worksheetRLC } from '../common.descriptions';
const properties = [
    workbookRLC,
    worksheetRLC,
    tableRLC,
    {
        displayName: 'Lookup Column',
        name: 'lookupColumn',
        type: 'string',
        default: '',
        placeholder: 'Email',
        required: true,
        description: 'The name of the column in which to look for value',
    },
    {
        displayName: 'Lookup Value',
        name: 'lookupValue',
        type: 'string',
        default: '',
        placeholder: 'frank@example.com',
        required: true,
        description: 'The value to look for in column',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Return All Matches',
                name: 'returnAllMatches',
                type: 'boolean',
                default: false,
                // eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
                description: 'By default only the first result gets returned. If options gets set all found matches get returned.',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['table'],
        operation: ['lookup'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        const qs = {};
        try {
            const workbookId = this.getNodeParameter('workbook', i, undefined, {
                extractValue: true,
            });
            const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
                extractValue: true,
            });
            const tableId = this.getNodeParameter('table', i, undefined, {
                extractValue: true,
            });
            const lookupColumn = this.getNodeParameter('lookupColumn', i);
            const lookupValue = this.getNodeParameter('lookupValue', i);
            const options = this.getNodeParameter('options', i);
            let responseData = await microsoftApiRequestAllItemsSkip.call(this, 'value', 'GET', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows`, {}, {}, i);
            qs.$select = 'name';
            // TODO: That should probably be cached in the future
            let columns = await microsoftApiRequestAllItemsSkip.call(this, 'value', 'GET', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`, {}, qs, i);
            columns = columns.map((column) => column.name);
            if (!columns.includes(lookupColumn)) {
                throw new NodeApiError(this.getNode(), responseData, {
                    message: `Column ${lookupColumn} does not exist on the table selected`,
                });
            }
            const result = [];
            for (let index = 0; index < responseData.length; index++) {
                const object = {};
                for (let y = 0; y < columns.length; y++) {
                    object[columns[y]] = responseData[index].values[0][y];
                }
                result.push({ ...object });
            }
            if (options.returnAllMatches) {
                responseData = result.filter((data) => {
                    return data[lookupColumn]?.toString() === lookupValue;
                });
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            else {
                responseData = result.find((data) => {
                    return data[lookupColumn]?.toString() === lookupValue;
                });
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                returnData.push(...executionErrorData);
                continue;
            }
            // A NodeError from the transport may be missing the itemIndex, add it
            throw stampItemIndexOnError(error, i);
        }
    }
    return returnData;
}
//# sourceMappingURL=lookup.operation.js.map