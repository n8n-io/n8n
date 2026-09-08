import { webhookMapping } from '../WebhookMapping';
const sort = (a, b) => {
    if (a.name < b.name) {
        return -1;
    }
    if (a.name > b.name) {
        return 1;
    }
    return 0;
};
export const eventDisplay = {
    displayName: 'Trigger On',
    name: 'triggerOn',
    type: 'options',
    options: Object.keys(webhookMapping)
        .map((webhook) => {
        const { name, value } = webhookMapping[webhook];
        return { name, value };
    })
        .sort(sort),
    required: true,
    default: [],
};
export const eventNameField = {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    options: [
        {
            displayName: 'Name',
            name: 'name',
            type: 'string',
            default: '',
            description: 'A name for the webhook for identification',
        },
    ],
};
//# sourceMappingURL=OnfleetWebhookDescription.js.map