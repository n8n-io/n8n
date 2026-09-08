import { wrapData } from '../../../../../../utils/utilities';
import { apiRequest } from '../../transport';
export const description = [
    {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['spreadsheet'],
                operation: ['create'],
            },
        },
        description: 'The title of the spreadsheet',
    },
    {
        displayName: 'Sheets',
        name: 'sheetsUi',
        placeholder: 'Add Sheet',
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
        default: {},
        options: [
            {
                name: 'sheetValues',
                displayName: 'Sheet',
                values: [
                    {
                        displayName: 'Title',
                        name: 'title',
                        type: 'string',
                        default: '',
                        description: 'Title of the property to create',
                    },
                    {
                        displayName: 'Hidden',
                        name: 'hidden',
                        type: 'boolean',
                        default: false,
                        description: 'Whether the Sheet should be hidden in the UI',
                    },
                ],
            },
        ],
        displayOptions: {
            show: {
                resource: ['spreadsheet'],
                operation: ['create'],
            },
        },
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
            show: {
                resource: ['spreadsheet'],
                operation: ['create'],
            },
        },
        options: [
            {
                displayName: 'Locale',
                name: 'locale',
                type: 'string',
                default: '',
                placeholder: 'en_US',
                description: `The locale of the spreadsheet in one of the following formats:
				<ul>
					<li>en (639-1)</li>
					<li>fil (639-2 if no 639-1 format exists)</li>
					<li>en_US (combination of ISO language an country)</li>
				<ul>`,
            },
            {
                displayName: 'Recalculation Interval',
                name: 'autoRecalc',
                type: 'options',
                options: [
                    {
                        name: 'Default',
                        value: '',
                        description: 'Default value',
                    },
                    {
                        name: 'On Change',
                        value: 'ON_CHANGE',
                        description: 'Volatile functions are updated on every change',
                    },
                    {
                        name: 'Minute',
                        value: 'MINUTE',
                        description: 'Volatile functions are updated on every change and every minute',
                    },
                    {
                        name: 'Hour',
                        value: 'HOUR',
                        description: 'Volatile functions are updated on every change and hourly',
                    },
                ],
                default: '',
                description: 'Cell recalculation interval options',
            },
        ],
    },
];
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        const title = this.getNodeParameter('title', i);
        const sheetsUi = this.getNodeParameter('sheetsUi', i, {});
        const body = {
            properties: {
                title,
                autoRecalc: undefined,
                locale: undefined,
            },
            sheets: [],
        };
        const options = this.getNodeParameter('options', i, {});
        if (Object.keys(sheetsUi).length) {
            const data = [];
            const sheets = sheetsUi.sheetValues;
            for (const properties of sheets) {
                data.push({ properties });
            }
            body.sheets = data;
        }
        body.properties.autoRecalc = options.autoRecalc ? options.autoRecalc : undefined;
        body.properties.locale = options.locale ? options.locale : undefined;
        const response = await apiRequest.call(this, 'POST', '/v4/spreadsheets', body);
        const executionData = this.helpers.constructExecutionMetaData(wrapData(response), { itemData: { item: i } });
        returnData.push(...executionData);
    }
    return returnData;
}
//# sourceMappingURL=create.operation.js.map