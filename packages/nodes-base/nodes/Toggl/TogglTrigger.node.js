import { DateTime } from 'luxon';
import moment from 'moment-timezone';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { togglApiRequest } from './GenericFunctions';
export class TogglTrigger {
    description = {
        displayName: 'Toggl Trigger',
        name: 'togglTrigger',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:toggl.png',
        group: ['trigger'],
        version: 1,
        description: 'Starts the workflow when Toggl events occur',
        defaults: {
            name: 'Toggl Trigger',
        },
        credentials: [
            {
                name: 'togglApi',
                required: true,
            },
        ],
        polling: true,
        inputs: [],
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                displayName: 'Event',
                name: 'event',
                type: 'options',
                options: [
                    {
                        name: 'New Time Entry',
                        value: 'newTimeEntry',
                    },
                ],
                required: true,
                default: 'newTimeEntry',
            },
        ],
    };
    async poll() {
        const webhookData = this.getWorkflowStaticData('node');
        const event = this.getNodeParameter('event');
        let endpoint;
        if (event === 'newTimeEntry') {
            endpoint = '/time_entries';
        }
        else {
            throw new NodeOperationError(this.getNode(), `The defined event "${event}" is not supported`);
        }
        const qs = {};
        let timeEntries = [];
        qs.start_date = webhookData.lastTimeChecked ?? DateTime.now().toISODate();
        qs.end_date = moment().format();
        try {
            timeEntries = await togglApiRequest.call(this, 'GET', endpoint, {}, qs);
            webhookData.lastTimeChecked = qs.end_date;
        }
        catch (error) {
            throw new NodeApiError(this.getNode(), error);
        }
        if (Array.isArray(timeEntries) && timeEntries.length !== 0) {
            return [this.helpers.returnJsonArray(timeEntries)];
        }
        return null;
    }
}
//# sourceMappingURL=TogglTrigger.node.js.map