import { wrapData } from '../../../../../../utils/utilities';
import { getExistingSheetNames, hexToRgb } from '../../helpers/GoogleSheets.utils';
import { apiRequest } from '../../transport';
export const description = [
    {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        required: true,
        default: 'n8n-sheet',
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['create'],
            },
        },
        description: 'The name of the sheet',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
            show: {
                resource: ['sheet'],
                operation: ['create'],
            },
        },
        options: [
            {
                displayName: 'Hidden',
                name: 'hidden',
                type: 'boolean',
                default: false,
                description: "Whether the sheet is hidden in the UI, false if it's visible",
            },
            {
                displayName: 'Right To Left',
                name: 'rightToLeft',
                type: 'boolean',
                default: false,
                description: 'Whether the sheet is an RTL sheet instead of an LTR sheet',
            },
            {
                displayName: 'Sheet ID',
                name: 'sheetId',
                type: 'number',
                default: 0,
                description: 'The ID of the sheet. Must be non-negative. This field cannot be changed once set.',
            },
            {
                displayName: 'Sheet Index',
                name: 'index',
                type: 'number',
                default: 0,
                description: 'The index of the sheet within the spreadsheet',
            },
            {
                displayName: 'Tab Color',
                name: 'tabColor',
                type: 'color',
                default: '0aa55c',
                description: 'The color of the tab in the UI',
            },
        ],
    },
];
export async function execute(sheet, sheetName) {
    let responseData;
    const returnData = [];
    const items = this.getInputData();
    const existingSheetNames = await getExistingSheetNames(sheet);
    for (let i = 0; i < items.length; i++) {
        const sheetTitle = this.getNodeParameter('title', i, {});
        if (existingSheetNames.includes(sheetTitle)) {
            continue;
        }
        const options = this.getNodeParameter('options', i, {});
        const properties = { ...options };
        properties.title = sheetTitle;
        if (options.tabColor) {
            const { red, green, blue } = hexToRgb(options.tabColor);
            properties.tabColor = { red: red / 255, green: green / 255, blue: blue / 255 };
        }
        const requests = [
            {
                addSheet: {
                    properties,
                },
            },
        ];
        responseData = await apiRequest.call(this, 'POST', `/v4/spreadsheets/${sheetName}:batchUpdate`, { requests });
        // simplify response
        Object.assign(responseData, responseData.replies[0].addSheet.properties);
        delete responseData.replies;
        existingSheetNames.push(sheetTitle);
        const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
        returnData.push(...executionData);
    }
    return returnData;
}
//# sourceMappingURL=create.operation.js.map