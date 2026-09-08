import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';
import { eventFields, eventOperations } from './EventDescripion';
import { validateJSON, veroApiRequest } from './GenericFunctions';
import { userFields, userOperations } from './UserDescription';
export class Vero {
    description = {
        displayName: 'Vero',
        name: 'vero',
        icon: 'file:vero.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Vero API',
        defaults: {
            name: 'Vero',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'veroApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'User',
                        value: 'user',
                        description: 'Create, update and manage the subscription status of your users',
                    },
                    {
                        name: 'Event',
                        value: 'event',
                        description: 'Track events based on actions your customers take in real time',
                    },
                ],
                default: 'user',
            },
            ...userOperations,
            ...eventOperations,
            ...userFields,
            ...eventFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        for (let i = 0; i < length; i++) {
            try {
                const resource = this.getNodeParameter('resource', 0);
                const operation = this.getNodeParameter('operation', 0);
                //https://developers.getvero.com/?bash#users
                if (resource === 'user') {
                    //https://developers.getvero.com/?bash#users-identify
                    if (operation === 'create') {
                        const id = this.getNodeParameter('id', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const jsonActive = this.getNodeParameter('jsonParameters', i);
                        const body = {
                            id,
                        };
                        if (additionalFields.email) {
                            body.email = additionalFields.email;
                        }
                        if (!jsonActive) {
                            const dataAttributesValues = this.getNodeParameter('dataAttributesUi', i).dataAttributesValues;
                            if (dataAttributesValues) {
                                const dataAttributes = {};
                                for (let index = 0; index < dataAttributesValues.length; index++) {
                                    dataAttributes[dataAttributesValues[index].key] =
                                        dataAttributesValues[index].value;
                                    body.data = dataAttributes;
                                }
                            }
                        }
                        else {
                            const dataAttributesJson = validateJSON(this.getNodeParameter('dataAttributesJson', i));
                            if (dataAttributesJson) {
                                body.data = dataAttributesJson;
                            }
                        }
                        try {
                            responseData = await veroApiRequest.call(this, 'POST', '/users/track', body);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developers.getvero.com/?bash#users-alias
                    if (operation === 'alias') {
                        const id = this.getNodeParameter('id', i);
                        const newId = this.getNodeParameter('newId', i);
                        const body = {
                            id,
                            new_id: newId,
                        };
                        try {
                            responseData = await veroApiRequest.call(this, 'PUT', '/users/reidentify', body);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developers.getvero.com/?bash#users-unsubscribe
                    //https://developers.getvero.com/?bash#users-resubscribe
                    //https://developers.getvero.com/?bash#users-delete
                    if (operation === 'unsubscribe' ||
                        operation === 'resubscribe' ||
                        operation === 'delete') {
                        const id = this.getNodeParameter('id', i);
                        const body = {
                            id,
                        };
                        try {
                            responseData = await veroApiRequest.call(this, 'POST', `/users/${operation}`, body);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                    //https://developers.getvero.com/?bash#tags-add
                    //https://developers.getvero.com/?bash#tags-remove
                    if (operation === 'addTags' || operation === 'removeTags') {
                        const id = this.getNodeParameter('id', i);
                        const tags = this.getNodeParameter('tags', i).split(',');
                        const body = {
                            id,
                        };
                        if (operation === 'addTags') {
                            body.add = JSON.stringify(tags);
                        }
                        if (operation === 'removeTags') {
                            body.remove = JSON.stringify(tags);
                        }
                        try {
                            responseData = await veroApiRequest.call(this, 'PUT', '/users/tags/edit', body);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                }
                //https://developers.getvero.com/?bash#events
                if (resource === 'event') {
                    //https://developers.getvero.com/?bash#events-track
                    if (operation === 'track') {
                        const id = this.getNodeParameter('id', i);
                        const email = this.getNodeParameter('email', i);
                        const eventName = this.getNodeParameter('eventName', i);
                        const jsonActive = this.getNodeParameter('jsonParameters', i);
                        const body = {
                            identity: { id, email },
                            event_name: eventName,
                            email,
                        };
                        if (!jsonActive) {
                            const dataAttributesValues = this.getNodeParameter('dataAttributesUi', i).dataAttributesValues;
                            if (dataAttributesValues) {
                                const dataAttributes = {};
                                for (let index = 0; index < dataAttributesValues.length; index++) {
                                    dataAttributes[dataAttributesValues[index].key] =
                                        dataAttributesValues[index].value;
                                    body.data = JSON.stringify(dataAttributes);
                                }
                            }
                            const extraAttributesValues = this.getNodeParameter('extraAttributesUi', i).extraAttributesValues;
                            if (extraAttributesValues) {
                                const extraAttributes = {};
                                for (let index = 0; index < extraAttributesValues.length; index++) {
                                    extraAttributes[extraAttributesValues[index].key] =
                                        extraAttributesValues[index].value;
                                    body.extras = JSON.stringify(extraAttributes);
                                }
                            }
                        }
                        else {
                            const dataAttributesJson = validateJSON(this.getNodeParameter('dataAttributesJson', i));
                            if (dataAttributesJson) {
                                body.data = JSON.stringify(dataAttributesJson);
                            }
                            const extraAttributesJson = validateJSON(this.getNodeParameter('extraAttributesJson', i));
                            if (extraAttributesJson) {
                                body.extras = JSON.stringify(extraAttributesJson);
                            }
                        }
                        try {
                            responseData = await veroApiRequest.call(this, 'POST', '/events/track', body);
                        }
                        catch (error) {
                            throw new NodeApiError(this.getNode(), error);
                        }
                    }
                }
                if (Array.isArray(responseData)) {
                    returnData.push.apply(returnData, responseData);
                }
                else {
                    returnData.push(responseData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Vero.node.js.map