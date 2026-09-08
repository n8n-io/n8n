import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, siteRLC, workbookRLC } from '../../descriptions/common.descriptions';
import { withWorkbookSession } from '../../helpers/sessions';
import { resolveWorkbookRoot } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
const properties = [
    workbookRLC,
    siteRLC,
    libraryRLC,
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                description: 'The name of the sheet to be added. The name should be unique. If not specified, Excel will determine the name of the new sheet.',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['workbook'],
        operation: ['addWorksheet'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
// Validated and read up front so the request-building code below only ever deals
// with `settings.xxx`, never raw `getNodeParameter` calls or `options.foo as bar`.
function getSettings(itemIndex) {
    const options = this.getNodeParameter('options', itemIndex, {});
    return {
        name: options.name || '',
    };
}
export async function execute(items) {
    // https://learn.microsoft.com/en-us/graph/api/worksheetcollection-add
    const returnData = [];
    // Hoisted once for the whole run and passed into resolveWorkbookRoot below,
    // so a multi-item run resolves each distinct address/site only once.
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    for (let i = 0; i < items.length; i++) {
        try {
            const settings = getSettings.call(this, i);
            const body = {};
            if (settings.name) {
                body.name = settings.name;
            }
            const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
            // Typed here instead of cast at the call site below. Parens are required:
            // a generic instantiation can't be followed directly by a property access.
            const responseData = await (withWorkbookSession).call(this, workbookRoot, async (headers) => await (microsoftApiRequest).call(this, 'POST', `${workbookRoot}/workbook/worksheets/add`, body, {}, undefined, headers));
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
//# sourceMappingURL=addWorksheet.operation.js.map