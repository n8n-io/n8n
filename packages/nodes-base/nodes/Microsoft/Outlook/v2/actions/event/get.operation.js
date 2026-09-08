import { updateDisplayOptions } from '@utils/utilities';
import { calendarRLC, eventRLC } from '../../descriptions';
import { decodeOutlookId, eventfields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    calendarRLC,
    eventRLC,
    {
        displayName: 'Output',
        name: 'output',
        type: 'options',
        default: 'simple',
        options: [
            {
                name: 'Simplified',
                value: 'simple',
            },
            {
                name: 'Raw',
                value: 'raw',
            },
            {
                name: 'Select Included Fields',
                value: 'fields',
            },
        ],
    },
    {
        displayName: 'Fields',
        name: 'fields',
        type: 'multiOptions',
        description: 'The fields to add to the output',
        displayOptions: {
            show: {
                output: ['fields'],
            },
        },
        options: eventfields,
        default: [],
    },
];
const displayOptions = {
    show: {
        resource: ['event'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const qs = {};
    const eventId = decodeOutlookId(this.getNodeParameter('eventId', index, undefined, {
        extractValue: true,
    }));
    const output = this.getNodeParameter('output', index);
    if (output === 'fields') {
        const fields = this.getNodeParameter('fields', index);
        qs.$select = fields.join(',');
    }
    if (output === 'simple') {
        qs.$select = 'id,subject,bodyPreview,start,end,organizer,attendees,webLink';
    }
    const endpoint = `/calendar/events/${eventId}`;
    const responseData = await microsoftApiRequest.call(this, 'GET', endpoint, index, undefined, qs);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=get.operation.js.map