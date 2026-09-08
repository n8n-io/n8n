import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, returnAllAndLimit, siteRLC, workbookRLC, } from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot } from '../../helpers/utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';
const properties = [
    siteRLC,
    libraryRLC,
    workbookRLC,
    ...returnAllAndLimit,
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'string',
                default: '',
                description: 'Fields to include in the response. Separate multiple fields with a comma.',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['table'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    // https://learn.microsoft.com/en-us/graph/api/workbook-list-tables
    const returnData = [];
    // Hoisted once for the whole run and passed into resolveWorkbookRoot below,
    // so a pasted Workbook/Site address is resolved once, not once per item.
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    for (let i = 0; i < items.length; i++) {
        try {
            const returnAll = this.getNodeParameter('returnAll', i);
            const options = this.getNodeParameter('options', i, {});
            const qs = {};
            if (options.fields) {
                qs.$select = options.fields;
            }
            const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
            const endpoint = `${workbookRoot}/workbook/tables`;
            let responseData;
            if (returnAll) {
                responseData = await (microsoftApiRequestAllItems).call(this, endpoint, qs);
            }
            else {
                qs.$top = this.getNodeParameter('limit', i);
                const response = await (microsoftApiRequest).call(this, 'GET', endpoint, {}, qs);
                responseData = response.value ?? [];
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        catch (error) {
            if (!this.continueOnFail())
                throw error;
            const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
            returnData.push.apply(returnData, executionErrorData);
        }
    }
    return returnData;
}
//# sourceMappingURL=getAll.operation.js.map