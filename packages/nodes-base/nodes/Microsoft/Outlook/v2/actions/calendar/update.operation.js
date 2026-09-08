import { updateDisplayOptions } from '@utils/utilities';
import { calendarRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    calendarRLC,
    {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
            {
                displayName: 'Color',
                name: 'color',
                type: 'options',
                default: 'lightBlue',
                options: [
                    {
                        name: 'Light Blue',
                        value: 'lightBlue',
                    },
                    {
                        name: 'Light Brown',
                        value: 'lightBrown',
                    },
                    {
                        name: 'Light Gray',
                        value: 'lightGray',
                    },
                    {
                        name: 'Light Green',
                        value: 'lightGreen',
                    },
                    {
                        name: 'Light Orange',
                        value: 'lightOrange',
                    },
                    {
                        name: 'Light Pink',
                        value: 'lightPink',
                    },
                    {
                        name: 'Light Red',
                        value: 'lightRed',
                    },
                    {
                        name: 'Light Teal',
                        value: 'lightTeal',
                    },
                    {
                        name: 'Light Yellow',
                        value: 'lightYellow',
                    },
                ],
                description: 'Specify the color to distinguish the calendar from the others',
            },
            {
                displayName: 'Default Calendar',
                name: 'isDefaultCalendar',
                type: 'boolean',
                default: false,
            },
            {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                placeholder: 'e.g. My Calendar',
                description: 'The name of the calendar',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['calendar'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const updateFields = this.getNodeParameter('updateFields', index);
    const calendarId = this.getNodeParameter('calendarId', index, undefined, {
        extractValue: true,
    });
    const endpoint = `/calendars/${calendarId}`;
    const body = {
        ...updateFields,
    };
    const responseData = await microsoftApiRequest.call(this, 'PATCH', endpoint, index, body);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=update.operation.js.map