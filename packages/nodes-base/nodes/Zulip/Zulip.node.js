import { snakeCase } from 'change-case';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { toMultiOptionsCsv, validateJSON, zulipApiRequest } from './GenericFunctions';
import { messageFields, messageOperations } from './MessageDescription';
import { streamFields, streamOperations } from './StreamDescription';
import { userFields, userOperations } from './UserDescription';
export class Zulip {
    description = {
        displayName: 'Zulip',
        name: 'zulip',
        icon: 'file:zulip.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Zulip API',
        defaults: {
            name: 'Zulip',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'zulipApi',
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
                        name: 'Message',
                        value: 'message',
                    },
                    {
                        name: 'Stream',
                        value: 'stream',
                    },
                    {
                        name: 'User',
                        value: 'user',
                    },
                ],
                default: 'message',
            },
            // MESSAGE
            ...messageOperations,
            ...messageFields,
            // STREAM
            ...streamOperations,
            ...streamFields,
            // USER
            ...userOperations,
            ...userFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available streams to display them to user so that they can
            // select them easily
            async getStreams() {
                const returnData = [];
                const { streams } = await zulipApiRequest.call(this, 'GET', '/streams');
                for (const stream of streams) {
                    const streamName = stream.name;
                    const streamId = stream.stream_id;
                    returnData.push({
                        name: streamName,
                        value: streamId,
                    });
                }
                return returnData;
            },
            // Get all the available topics to display them to user so that they can
            // select them easily
            async getTopics() {
                const streamId = this.getCurrentNodeParameter('stream');
                const returnData = [];
                const { topics } = await zulipApiRequest.call(this, 'GET', `/users/me/${streamId}/topics`);
                for (const topic of topics) {
                    const topicName = topic.name;
                    const topicId = topic.name;
                    returnData.push({
                        name: topicName,
                        value: topicId,
                    });
                }
                return returnData;
            },
            // Get all the available users to display them to user so that they can
            // select them easily
            async getUsers() {
                const returnData = [];
                const { members } = await zulipApiRequest.call(this, 'GET', '/users');
                for (const member of members) {
                    const memberName = member.full_name;
                    const memberId = member.email;
                    returnData.push({
                        name: memberName,
                        value: memberId,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'message') {
                    //https://zulipchat.com/api/send-message
                    if (operation === 'sendPrivate') {
                        const to = toMultiOptionsCsv(this.getNodeParameter('to', i));
                        const content = this.getNodeParameter('content', i);
                        const body = {
                            type: 'private',
                            to,
                            content,
                        };
                        responseData = await zulipApiRequest.call(this, 'POST', '/messages', body);
                    }
                    //https://zulipchat.com/api/send-message
                    if (operation === 'sendStream') {
                        const stream = this.getNodeParameter('stream', i);
                        const topic = this.getNodeParameter('topic', i);
                        const content = this.getNodeParameter('content', i);
                        const body = {
                            type: 'stream',
                            to: stream,
                            topic,
                            content,
                        };
                        responseData = await zulipApiRequest.call(this, 'POST', '/messages', body);
                    }
                    //https://zulipchat.com/api/update-message
                    if (operation === 'update') {
                        const messageId = this.getNodeParameter('messageId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.content) {
                            body.content = updateFields.content;
                        }
                        if (updateFields.propagateMode) {
                            body.propagate_mode = snakeCase(updateFields.propagateMode);
                        }
                        if (updateFields.topic) {
                            body.topic = updateFields.topic;
                        }
                        responseData = await zulipApiRequest.call(this, 'PATCH', `/messages/${messageId}`, body);
                    }
                    //https://zulipchat.com/api/get-raw-message
                    if (operation === 'get') {
                        const messageId = this.getNodeParameter('messageId', i);
                        responseData = await zulipApiRequest.call(this, 'GET', `/messages/${messageId}`);
                    }
                    //https://zulipchat.com/api/delete-message
                    if (operation === 'delete') {
                        const messageId = this.getNodeParameter('messageId', i);
                        responseData = await zulipApiRequest.call(this, 'DELETE', `/messages/${messageId}`);
                    }
                    //https://zulipchat.com/api/upload-file
                    if (operation === 'updateFile') {
                        const credentials = await this.getCredentials('zulipApi');
                        const dataBinaryProperty = this.getNodeParameter('dataBinaryProperty', i);
                        const binaryData = this.helpers.assertBinaryData(i, dataBinaryProperty);
                        const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, dataBinaryProperty);
                        const formData = {
                            file: {
                                value: binaryDataBuffer,
                                options: {
                                    filename: binaryData.fileName,
                                    contentType: binaryData.mimeType,
                                },
                            },
                        };
                        responseData = await zulipApiRequest.call(this, 'POST', '/user_uploads', {}, {}, undefined, { formData });
                        responseData.uri = `${credentials.url}${responseData.uri}`;
                    }
                }
                if (resource === 'stream') {
                    const body = {};
                    if (operation === 'getAll') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.includePublic) {
                            body.include_public = additionalFields.includePublic;
                        }
                        if (additionalFields.includeSubscribed) {
                            body.include_subscribed = additionalFields.includeSubscribed;
                        }
                        if (additionalFields.includeAllActive) {
                            body.include_all_active = additionalFields.includeAllActive;
                        }
                        if (additionalFields.includeDefault) {
                            body.include_default = additionalFields.includeDefault;
                        }
                        if (additionalFields.includeOwnersubscribed) {
                            body.include_owner_subscribed = additionalFields.includeOwnersubscribed;
                        }
                        responseData = await zulipApiRequest.call(this, 'GET', '/streams', body);
                        responseData = responseData.streams;
                    }
                    if (operation === 'getSubscribed') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.includeSubscribers) {
                            body.include_subscribers = additionalFields.includeSubscribers;
                        }
                        responseData = await zulipApiRequest.call(this, 'GET', '/users/me/subscriptions', body);
                        responseData = responseData.subscriptions;
                    }
                    if (operation === 'create') {
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        const subscriptions = this.getNodeParameter('subscriptions', i);
                        body.subscriptions = JSON.stringify(subscriptions.properties);
                        if (jsonParameters) {
                            const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                            if (additionalFieldsJson !== '') {
                                if (validateJSON(additionalFieldsJson) !== undefined) {
                                    Object.assign(body, JSON.parse(additionalFieldsJson));
                                }
                                else {
                                    throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                                }
                            }
                        }
                        else {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            body.subscriptions = JSON.stringify(subscriptions.properties);
                            if (additionalFields.inviteOnly) {
                                body.invite_only = additionalFields.inviteOnly;
                            }
                            if (additionalFields.principals) {
                                const principals = [];
                                //@ts-ignore
                                additionalFields.principals.properties.map((principal) => {
                                    principals.push(principal.email);
                                });
                                body.principals = JSON.stringify(principals);
                            }
                            if (additionalFields.authorizationErrorsFatal) {
                                body.authorization_errors_fatal =
                                    additionalFields.authorizationErrorsFatal;
                            }
                            if (additionalFields.historyPublicToSubscribers) {
                                body.history_public_to_subscribers =
                                    additionalFields.historyPublicToSubscribers;
                            }
                            if (additionalFields.streamPostPolicy) {
                                body.stream_post_policy = additionalFields.streamPostPolicy;
                            }
                            if (additionalFields.announce) {
                                body.announce = additionalFields.announce;
                            }
                        }
                        responseData = await zulipApiRequest.call(this, 'POST', '/users/me/subscriptions', body);
                    }
                    if (operation === 'delete') {
                        const streamId = this.getNodeParameter('streamId', i);
                        responseData = await zulipApiRequest.call(this, 'DELETE', `/streams/${streamId}`, {});
                    }
                    if (operation === 'update') {
                        const streamId = this.getNodeParameter('streamId', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        if (jsonParameters) {
                            const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i);
                            if (additionalFieldsJson !== '') {
                                if (validateJSON(additionalFieldsJson) !== undefined) {
                                    Object.assign(body, JSON.parse(additionalFieldsJson));
                                }
                                else {
                                    throw new NodeOperationError(this.getNode(), 'Additional fields must be a valid JSON', { itemIndex: i });
                                }
                            }
                        }
                        else {
                            const additionalFields = this.getNodeParameter('additionalFields', i);
                            if (additionalFields.description) {
                                body.description = JSON.stringify(additionalFields.description);
                            }
                            if (additionalFields.newName) {
                                body.new_name = JSON.stringify(additionalFields.newName);
                            }
                            if (additionalFields.isPrivate) {
                                body.is_private = additionalFields.isPrivate;
                            }
                            if (additionalFields.isAnnouncementOnly) {
                                body.is_announcement_only = additionalFields.isAnnouncementOnly;
                            }
                            if (additionalFields.streamPostPolicy) {
                                body.stream_post_policy = additionalFields.streamPostPolicy;
                            }
                            if (additionalFields.historyPublicToSubscribers) {
                                body.history_public_to_subscribers =
                                    additionalFields.historyPublicToSubscribers;
                            }
                            responseData = await zulipApiRequest.call(this, 'PATCH', `/streams/${streamId}`, body);
                        }
                    }
                }
                if (resource === 'user') {
                    const body = {};
                    if (operation === 'get') {
                        const userId = this.getNodeParameter('userId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.clientGravatar) {
                            body.client_gravatar = additionalFields.client_gravatar;
                        }
                        if (additionalFields.includeCustomProfileFields) {
                            body.include_custom_profile_fields =
                                additionalFields.includeCustomProfileFields;
                        }
                        responseData = await zulipApiRequest.call(this, 'GET', `/users/${userId}`, body);
                    }
                    if (operation === 'getAll') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.clientGravatar) {
                            body.client_gravatar = additionalFields.client_gravatar;
                        }
                        if (additionalFields.includeCustomProfileFields) {
                            body.include_custom_profile_fields =
                                additionalFields.includeCustomProfileFields;
                        }
                        responseData = await zulipApiRequest.call(this, 'GET', '/users', body);
                        responseData = responseData.members;
                    }
                    if (operation === 'create') {
                        body.email = this.getNodeParameter('email', i);
                        body.password = this.getNodeParameter('password', i);
                        body.full_name = this.getNodeParameter('fullName', i);
                        body.short_name = this.getNodeParameter('shortName', i);
                        responseData = await zulipApiRequest.call(this, 'POST', '/users', body);
                    }
                    if (operation === 'update') {
                        const userId = this.getNodeParameter('userId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.fullName) {
                            body.full_name = JSON.stringify(additionalFields.fullName);
                        }
                        if (additionalFields.isAdmin) {
                            body.is_admin = additionalFields.isAdmin;
                        }
                        if (additionalFields.isGuest) {
                            body.is_guest = additionalFields.isGuest;
                        }
                        if (additionalFields.role) {
                            body.role = additionalFields.role;
                        }
                        if (additionalFields.profileData) {
                            //@ts-ignore
                            body.profile_data = additionalFields.profileData.properties;
                        }
                        responseData = await zulipApiRequest.call(this, 'PATCH', `/users/${userId}`, body);
                    }
                    if (operation === 'deactivate') {
                        const userId = this.getNodeParameter('userId', i);
                        responseData = await zulipApiRequest.call(this, 'DELETE', `/users/${userId}`, body);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Zulip.node.js.map