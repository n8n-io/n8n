import { updateDisplayOptions } from '@utils/utilities';
// Reused from the OneDrive node so the two nodes' output shapes cannot drift
import { checkRange, prepareOutput } from '../../../Excel/v2/helpers/utils';
import { libraryRLC, siteRLC, workbookRLC, worksheetRLC, } from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
const properties = [
    workbookRLC,
    siteRLC,
    libraryRLC,
    worksheetRLC,
    {
        displayName: 'Select a Range',
        name: 'useRange',
        type: 'boolean',
        default: false,
    },
    {
        displayName: 'Range',
        name: 'range',
        type: 'string',
        placeholder: 'e.g. A1:B2',
        default: '',
        description: 'The sheet range to read the data from specified using a A1-style notation, has to be specific e.g A1:B5, generic ranges like A:B are not supported',
        hint: 'Leave blank to return entire sheet',
        displayOptions: {
            show: {
                useRange: [true],
            },
        },
    },
    {
        displayName: 'Header Row',
        name: 'keyRow',
        type: 'number',
        typeOptions: {
            minValue: 0,
        },
        default: 0,
        hint: 'Index of the row which contains the column names',
        description: "Relative to selected 'Range', first row index is 0",
        displayOptions: {
            show: {
                useRange: [true],
            },
        },
    },
    {
        displayName: 'First Data Row',
        name: 'dataStartRow',
        type: 'number',
        typeOptions: {
            minValue: 0,
        },
        default: 1,
        hint: 'Index of first row which contains the actual data',
        description: "Relative to selected 'Range', first row index is 0",
        displayOptions: {
            show: {
                useRange: [true],
            },
        },
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'RAW Data',
                name: 'rawData',
                type: 'boolean',
                // eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-boolean
                default: 0,
                description: 'Whether the data should be returned RAW instead of parsed into keys according to their header',
            },
            {
                displayName: 'Data Property',
                name: 'dataProperty',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        rawData: [true],
                    },
                },
                description: 'The name of the property into which to write the RAW data',
            },
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'string',
                default: '',
                description: 'Fields the response will contain. Multiple can be added separated by ,.',
                displayOptions: {
                    show: {
                        rawData: [true],
                    },
                },
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['worksheet'],
        operation: ['readRows'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
// Validated and read up front so the request-building code below only ever deals
// with `settings.xxx`, never raw `getNodeParameter` calls or `options.foo as bar`.
function getSettings(itemIndex) {
    const worksheetId = validatePathSegment(this.getNode(), 'Sheet', this.getNodeParameter('worksheet', itemIndex, '', { extractValue: true }));
    const range = this.getNodeParameter('range', itemIndex, '');
    checkRange(this.getNode(), range);
    const options = this.getNodeParameter('options', itemIndex, {});
    return {
        worksheetId,
        range,
        rawData: options.rawData || false,
        keyRow: this.getNodeParameter('keyRow', itemIndex, 0),
        firstDataRow: this.getNodeParameter('dataStartRow', itemIndex, 1),
        dataProperty: options.dataProperty || 'data',
        fields: options.fields || '',
    };
}
export async function execute(items) {
    // https://learn.microsoft.com/en-us/graph/api/worksheet-range
    const returnData = [];
    // Hoisted once for the whole run and passed into resolveWorkbookRoot below,
    // so a pasted Workbook/Site address is resolved once, not once per item.
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    for (let i = 0; i < items.length; i++) {
        try {
            // Validate everything local before the workbook resolution, which may
            // cost a request in URL mode
            const settings = getSettings.call(this, i);
            const qs = {};
            if (settings.rawData && settings.fields) {
                qs.$select = settings.fields;
            }
            const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
            const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(settings.worksheetId)}`;
            // Typed here instead of cast at the call site below. Parens are required:
            // a generic instantiation can't be followed directly by a property access.
            const responseData = await (microsoftApiRequest).call(this, 'GET', settings.range
                ? `${sheetPath}/range(address='${encodeURIComponent(settings.range)}')`
                : `${sheetPath}/usedRange`, {}, qs);
            // prepareOutput branches on `rawData` internally and ignores whichever
            // of keyRow/firstDataRow/dataProperty doesn't apply to the chosen mode
            const preparedData = prepareOutput.call(this, this.getNode(), responseData, {
                rawData: settings.rawData,
                keyRow: settings.keyRow,
                firstDataRow: settings.firstDataRow,
                dataProperty: settings.dataProperty,
            });
            returnData.push.apply(returnData, preparedData);
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
//# sourceMappingURL=readRows.operation.js.map