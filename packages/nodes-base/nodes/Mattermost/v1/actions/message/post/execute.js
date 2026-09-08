import { apiRequest } from '../../../transport';
export async function post(index) {
    const body = {};
    const qs = {};
    const requestMethod = 'POST';
    const endpoint = 'posts';
    body.channel_id = this.getNodeParameter('channelId', index);
    body.message = this.getNodeParameter('message', index);
    const attachments = this.getNodeParameter('attachments', index, []);
    // The node does save the fields data differently than the API
    // expects so fix the data befre we send the request
    for (const attachment of attachments) {
        if (attachment.fields !== undefined) {
            if (attachment.fields.item !== undefined) {
                // Move the field-content up
                // @ts-ignore
                attachment.fields = attachment.fields.item;
            }
            else {
                // If it does not have any items set remove it
                // @ts-ignore
                delete attachment.fields;
            }
        }
    }
    for (const attachment of attachments) {
        if (attachment.actions !== undefined) {
            if (attachment.actions.item !== undefined) {
                // Move the field-content up
                // @ts-ignore
                attachment.actions = attachment.actions.item;
            }
            else {
                // If it does not have any items set remove it
                // @ts-ignore
                delete attachment.actions;
            }
        }
    }
    for (const attachment of attachments) {
        if (Array.isArray(attachment.actions)) {
            for (const attaction of attachment.actions) {
                if (attaction.type === 'button') {
                    delete attaction.type;
                }
                if (attaction.data_source === 'custom') {
                    delete attaction.data_source;
                }
                if (attaction.options) {
                    attaction.options = attaction.options.option;
                }
                if (attaction.integration.item !== undefined) {
                    attaction.integration = attaction.integration.item;
                    if (Array.isArray(attaction.integration.context.property)) {
                        const tmpcontex = {};
                        for (const attactionintegprop of attaction.integration.context.property) {
                            Object.assign(tmpcontex, { [attactionintegprop.name]: attactionintegprop.value });
                        }
                        delete attaction.integration.context;
                        attaction.integration.context = tmpcontex;
                    }
                }
            }
        }
    }
    body.props = {
        attachments,
    };
    // Add all the other options to the request
    const otherOptions = this.getNodeParameter('otherOptions', index);
    Object.assign(body, otherOptions);
    const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
    return this.helpers.returnJsonArray(responseData);
}
//# sourceMappingURL=execute.js.map