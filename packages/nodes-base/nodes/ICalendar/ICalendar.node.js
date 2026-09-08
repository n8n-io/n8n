import { NodeConnectionTypes } from 'n8n-workflow';
import * as createEvent from './createEvent.operation';
export class ICalendar {
    description = {
        hidden: true,
        displayName: 'iCalendar',
        name: 'iCal',
        icon: 'fa:calendar',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Create iCalendar file',
        defaults: {
            name: 'iCalendar',
            color: '#408000',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Create Event File',
                        value: 'createEventFile',
                    },
                ],
                default: 'createEventFile',
            },
            ...createEvent.description,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const operation = this.getNodeParameter('operation', 0);
        let returnData = [];
        if (operation === 'createEventFile') {
            returnData = await createEvent.execute.call(this, items);
        }
        return [returnData];
    }
}
//# sourceMappingURL=ICalendar.node.js.map