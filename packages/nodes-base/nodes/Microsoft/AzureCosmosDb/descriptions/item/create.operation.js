import { updateDisplayOptions } from 'n8n-workflow';
import { processJsonInput, untilContainerSelected } from '../../helpers/utils';
import { containerResourceLocator } from '../common';
const properties = [
    { ...containerResourceLocator, description: 'Select the container you want to use' },
    {
        displayName: 'Item Contents',
        name: 'customProperties',
        default: '{\n\t"id": "replace_with_new_document_id"\n}',
        description: 'The item contents as a JSON object',
        displayOptions: {
            hide: {
                ...untilContainerSelected,
            },
        },
        hint: 'The item requires an ID and partition key value if a custom key is set',
        required: true,
        routing: {
            send: {
                preSend: [
                    async function (requestOptions) {
                        const rawCustomProperties = this.getNodeParameter('customProperties');
                        const customProperties = processJsonInput(rawCustomProperties, 'Item Contents', undefined, ['id']);
                        requestOptions.body = customProperties;
                        return requestOptions;
                    },
                ],
            },
        },
        type: 'json',
    },
];
const displayOptions = {
    show: {
        resource: ['item'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=create.operation.js.map