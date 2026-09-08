import moment from 'moment-timezone';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { oldVersionNotice } from '@utils/descriptions';
import { channelFields, channelOperations } from './ChannelDescription';
import { fileFields, fileOperations } from './FileDescription';
import { slackApiRequest, slackApiRequestAllItems, toMultiOptionsCsv, validateJSON, } from './GenericFunctions';
import { messageFields, messageOperations } from './MessageDescription';
import { reactionFields, reactionOperations } from './ReactionDescription';
import { starFields, starOperations } from './StarDescription';
import { userFields, userOperations } from './UserDescription';
import { userGroupFields, userGroupOperations } from './UserGroupDescription';
import { userProfileFields, userProfileOperations } from './UserProfileDescription';
export class SlackV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            version: 1,
            defaults: {
                name: 'Slack',
            },
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'slackApi',
                    required: true,
                    displayOptions: {
                        show: {
                            authentication: ['accessToken'],
                        },
                    },
                },
                {
                    name: 'slackOAuth2Api',
                    required: true,
                    displayOptions: {
                        show: {
                            authentication: ['oAuth2'],
                        },
                    },
                },
            ],
            properties: [
                oldVersionNotice,
                {
                    displayName: 'Authentication',
                    name: 'authentication',
                    type: 'options',
                    options: [
                        {
                            name: 'Access Token',
                            value: 'accessToken',
                        },
                        {
                            name: 'OAuth2',
                            value: 'oAuth2',
                        },
                    ],
                    default: 'accessToken',
                },
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Channel',
                            value: 'channel',
                        },
                        {
                            name: 'File',
                            value: 'file',
                        },
                        {
                            name: 'Message',
                            value: 'message',
                        },
                        {
                            name: 'Reaction',
                            value: 'reaction',
                        },
                        {
                            name: 'Star',
                            value: 'star',
                        },
                        {
                            name: 'User',
                            value: 'user',
                        },
                        {
                            name: 'User Group',
                            value: 'userGroup',
                        },
                        {
                            name: 'User Profile',
                            value: 'userProfile',
                        },
                    ],
                    default: 'message',
                },
                ...channelOperations,
                ...channelFields,
                ...messageOperations,
                ...messageFields,
                ...starOperations,
                ...starFields,
                ...fileOperations,
                ...fileFields,
                ...reactionOperations,
                ...reactionFields,
                ...userOperations,
                ...userFields,
                ...userGroupOperations,
                ...userGroupFields,
                ...userProfileOperations,
                ...userProfileFields,
            ],
        };
    }
    methods = {
        loadOptions: {
            // Get all the users to display them to user so that they can
            // select them easily
            async getUsers() {
                const returnData = [];
                const users = await slackApiRequestAllItems.call(this, 'members', 'GET', '/users.list');
                for (const user of users) {
                    const userName = user.name;
                    const userId = user.id;
                    returnData.push({
                        name: userName,
                        value: userId,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
            // Get all the users to display them to user so that they can
            // select them easily
            async getChannels() {
                const returnData = [];
                const qs = { types: 'public_channel,private_channel', limit: 1000 };
                const channels = await slackApiRequestAllItems.call(this, 'channels', 'GET', '/conversations.list', {}, qs);
                for (const channel of channels) {
                    const channelName = channel.name;
                    const channelId = channel.id;
                    returnData.push({
                        name: channelName,
                        value: channelId,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
            // Get all the team fields to display them to user so that they can
            // select them easily
            async getTeamFields() {
                const returnData = [];
                const { profile: { fields }, } = await slackApiRequest.call(this, 'GET', '/team.profile.get');
                for (const field of fields) {
                    const fieldName = field.label;
                    const fieldId = field.id;
                    returnData.push({
                        name: fieldName,
                        value: fieldId,
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
        let qs;
        let responseData;
        const authentication = this.getNodeParameter('authentication', 0);
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                responseData = {
                    error: 'Resource ' + resource + ' / operation ' + operation + ' not found!',
                };
                qs = {};
                if (resource === 'channel') {
                    //https://api.slack.com/methods/conversations.archive
                    if (operation === 'archive') {
                        const channel = this.getNodeParameter('channelId', i);
                        const body = {
                            channel,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.archive', body, qs);
                    }
                    //https://api.slack.com/methods/conversations.close
                    if (operation === 'close') {
                        const channel = this.getNodeParameter('channelId', i);
                        const body = {
                            channel,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.close', body, qs);
                    }
                    //https://api.slack.com/methods/conversations.create
                    if (operation === 'create') {
                        const channel = this.getNodeParameter('channelId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            name: channel,
                        };
                        if (additionalFields.isPrivate) {
                            body.is_private = additionalFields.isPrivate;
                        }
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.create', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.kick
                    if (operation === 'kick') {
                        const channel = this.getNodeParameter('channelId', i);
                        const userId = this.getNodeParameter('userId', i);
                        const body = {
                            channel,
                            user: userId,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.kick', body, qs);
                    }
                    //https://api.slack.com/methods/conversations.join
                    if (operation === 'join') {
                        const channel = this.getNodeParameter('channelId', i);
                        const body = {
                            channel,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.join', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.info
                    if (operation === 'get') {
                        const channel = this.getNodeParameter('channelId', i);
                        qs.channel = channel;
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.info', {}, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i);
                        if (filters.types) {
                            qs.types = toMultiOptionsCsv(filters.types);
                        }
                        if (filters.excludeArchived) {
                            qs.exclude_archived = filters.excludeArchived;
                        }
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'channels', 'GET', '/conversations.list', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/conversations.list', {}, qs);
                            responseData = responseData.channels;
                        }
                    }
                    //https://api.slack.com/methods/conversations.history
                    if (operation === 'history') {
                        const channel = this.getNodeParameter('channelId', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i);
                        qs.channel = channel;
                        if (filters.inclusive) {
                            qs.inclusive = filters.inclusive;
                        }
                        if (filters.latest) {
                            qs.latest = new Date(filters.latest).getTime() / 1000;
                        }
                        if (filters.oldest) {
                            qs.oldest = new Date(filters.oldest).getTime() / 1000;
                        }
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'messages', 'GET', '/conversations.history', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/conversations.history', {}, qs);
                            responseData = responseData.messages;
                        }
                    }
                    //https://api.slack.com/methods/conversations.invite
                    if (operation === 'invite') {
                        const channel = this.getNodeParameter('channelId', i);
                        const userIds = toMultiOptionsCsv(this.getNodeParameter('userIds', i));
                        const body = {
                            channel,
                            users: userIds,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.invite', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.leave
                    if (operation === 'leave') {
                        const channel = this.getNodeParameter('channelId', i);
                        const body = {
                            channel,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.leave', body, qs);
                    }
                    //https://api.slack.com/methods/conversations.members
                    if (operation === 'member') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const resolveData = this.getNodeParameter('resolveData', 0);
                        qs.channel = this.getNodeParameter('channelId', i);
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'members', 'GET', '/conversations.members', {}, qs);
                            responseData = responseData.map((member) => ({ member }));
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/conversations.members', {}, qs);
                            responseData = responseData.members.map((member) => ({ member }));
                        }
                        if (resolveData) {
                            const data = [];
                            for (const { member } of responseData) {
                                const { user } = await slackApiRequest.call(this, 'GET', '/users.info', {}, { user: member });
                                data.push(user);
                            }
                            responseData = data;
                        }
                    }
                    //https://api.slack.com/methods/conversations.open
                    if (operation === 'open') {
                        const options = this.getNodeParameter('options', i);
                        const body = {};
                        if (options.channelId) {
                            body.channel = options.channelId;
                        }
                        if (options.returnIm) {
                            body.return_im = options.returnIm;
                        }
                        if (options.users) {
                            body.users = toMultiOptionsCsv(options.users);
                        }
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.open', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.rename
                    if (operation === 'rename') {
                        const channel = this.getNodeParameter('channelId', i);
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            channel,
                            name,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.rename', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.replies
                    if (operation === 'replies') {
                        const channel = this.getNodeParameter('channelId', i);
                        const ts = this.getNodeParameter('ts', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i);
                        qs.channel = channel;
                        qs.ts = ts;
                        if (filters.inclusive) {
                            qs.inclusive = filters.inclusive;
                        }
                        if (filters.latest) {
                            qs.latest = new Date(filters.latest).getTime() / 1000;
                        }
                        if (filters.oldest) {
                            qs.oldest = new Date(filters.oldest).getTime() / 1000;
                        }
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'messages', 'GET', '/conversations.replies', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/conversations.replies', {}, qs);
                            responseData = responseData.messages;
                        }
                    }
                    //https://api.slack.com/methods/conversations.setPurpose
                    if (operation === 'setPurpose') {
                        const channel = this.getNodeParameter('channelId', i);
                        const purpose = this.getNodeParameter('purpose', i);
                        const body = {
                            channel,
                            purpose,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.setPurpose', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.setTopic
                    if (operation === 'setTopic') {
                        const channel = this.getNodeParameter('channelId', i);
                        const topic = this.getNodeParameter('topic', i);
                        const body = {
                            channel,
                            topic,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.setTopic', body, qs);
                        responseData = responseData.channel;
                    }
                    //https://api.slack.com/methods/conversations.unarchive
                    if (operation === 'unarchive') {
                        const channel = this.getNodeParameter('channelId', i);
                        const body = {
                            channel,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/conversations.unarchive', body, qs);
                    }
                }
                if (resource === 'message') {
                    //https://api.slack.com/methods/chat.postMessage
                    if (['post', 'postEphemeral'].includes(operation)) {
                        const channel = this.getNodeParameter('channel', i);
                        const { sendAsUser } = this.getNodeParameter('otherOptions', i);
                        const text = this.getNodeParameter('text', i);
                        const body = {
                            channel,
                            text,
                        };
                        let action = 'postMessage';
                        if (operation === 'postEphemeral') {
                            body.user = this.getNodeParameter('user', i);
                            action = 'postEphemeral';
                        }
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        if (authentication === 'accessToken' && sendAsUser !== '') {
                            body.username = sendAsUser;
                        }
                        if (!jsonParameters) {
                            const attachments = this.getNodeParameter('attachments', i, []);
                            const blocksUi = this.getNodeParameter('blocksUi', i, [])
                                .blocksValues;
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
                            body.attachments = attachments;
                            if (blocksUi) {
                                const blocks = [];
                                for (const blockUi of blocksUi) {
                                    const block = {};
                                    const elements = [];
                                    block.block_id = blockUi.blockId;
                                    block.type = blockUi.type;
                                    if (block.type === 'actions') {
                                        const elementsUi = blockUi.elementsUi
                                            .elementsValues;
                                        if (elementsUi) {
                                            for (const elementUi of elementsUi) {
                                                const element = {};
                                                if (elementUi.actionId === '') {
                                                    throw new NodeOperationError(this.getNode(), 'Action ID must be set', {
                                                        itemIndex: i,
                                                    });
                                                }
                                                if (elementUi.text === '') {
                                                    throw new NodeOperationError(this.getNode(), 'Text must be set', {
                                                        itemIndex: i,
                                                    });
                                                }
                                                element.action_id = elementUi.actionId;
                                                element.type = elementUi.type;
                                                element.text = {
                                                    text: elementUi.text,
                                                    type: 'plain_text',
                                                    emoji: elementUi.emoji,
                                                };
                                                if (elementUi.url) {
                                                    element.url = elementUi.url;
                                                }
                                                if (elementUi.value) {
                                                    element.value = elementUi.value;
                                                }
                                                if (elementUi.style !== 'default') {
                                                    element.style = elementUi.style;
                                                }
                                                const confirmUi = elementUi.confirmUi
                                                    .confirmValue;
                                                if (confirmUi) {
                                                    const confirm = {};
                                                    const titleUi = confirmUi.titleUi
                                                        .titleValue;
                                                    const textUi = confirmUi.textUi.textValue;
                                                    const confirmTextUi = confirmUi.confirmTextUi
                                                        .confirmValue;
                                                    const denyUi = confirmUi.denyUi.denyValue;
                                                    const style = confirmUi.style;
                                                    if (titleUi) {
                                                        confirm.title = {
                                                            type: 'plain_text',
                                                            text: titleUi.text,
                                                            emoji: titleUi.emoji,
                                                        };
                                                    }
                                                    if (textUi) {
                                                        confirm.text = {
                                                            type: 'plain_text',
                                                            text: textUi.text,
                                                            emoji: textUi.emoji,
                                                        };
                                                    }
                                                    if (confirmTextUi) {
                                                        confirm.confirm = {
                                                            type: 'plain_text',
                                                            text: confirmTextUi.text,
                                                            emoji: confirmTextUi.emoji,
                                                        };
                                                    }
                                                    if (denyUi) {
                                                        confirm.deny = {
                                                            type: 'plain_text',
                                                            text: denyUi.text,
                                                            emoji: denyUi.emoji,
                                                        };
                                                    }
                                                    if (style !== 'default') {
                                                        confirm.style = style;
                                                    }
                                                    element.confirm = confirm;
                                                }
                                                elements.push(element);
                                            }
                                            block.elements = elements;
                                        }
                                    }
                                    else if (block.type === 'section') {
                                        const textUi = blockUi.textUi.textValue;
                                        if (textUi) {
                                            const text = {};
                                            if (textUi.type === 'plainText') {
                                                text.type = 'plain_text';
                                                text.emoji = textUi.emoji;
                                            }
                                            else {
                                                text.type = 'mrkdwn';
                                                text.verbatim = textUi.verbatim;
                                            }
                                            text.text = textUi.text;
                                            block.text = text;
                                        }
                                        else {
                                            throw new NodeOperationError(this.getNode(), 'Property text must be defined', { itemIndex: i });
                                        }
                                        const fieldsUi = blockUi.fieldsUi
                                            .fieldsValues;
                                        if (fieldsUi) {
                                            const fields = [];
                                            for (const fieldUi of fieldsUi) {
                                                const field = {};
                                                if (fieldUi.type === 'plainText') {
                                                    field.type = 'plain_text';
                                                    field.emoji = fieldUi.emoji;
                                                }
                                                else {
                                                    field.type = 'mrkdwn';
                                                    field.verbatim = fieldUi.verbatim;
                                                }
                                                field.text = fieldUi.text;
                                                fields.push(field);
                                            }
                                            // If not fields were added then it's not needed to send the property
                                            if (fields.length > 0) {
                                                block.fields = fields;
                                            }
                                        }
                                        const accessoryUi = blockUi.accessoryUi
                                            .accessoriesValues;
                                        if (accessoryUi) {
                                            const accessory = {};
                                            if (accessoryUi.type === 'button') {
                                                accessory.type = 'button';
                                                accessory.text = {
                                                    text: accessoryUi.text,
                                                    type: 'plain_text',
                                                    emoji: accessoryUi.emoji,
                                                };
                                                if (accessoryUi.url) {
                                                    accessory.url = accessoryUi.url;
                                                }
                                                if (accessoryUi.value) {
                                                    accessory.value = accessoryUi.value;
                                                }
                                                if (accessoryUi.style !== 'default') {
                                                    accessory.style = accessoryUi.style;
                                                }
                                                const confirmUi = accessoryUi.confirmUi
                                                    .confirmValue;
                                                if (confirmUi) {
                                                    const confirm = {};
                                                    const titleUi = confirmUi.titleUi
                                                        .titleValue;
                                                    const textUi = confirmUi.textUi.textValue;
                                                    const confirmTextUi = confirmUi.confirmTextUi
                                                        .confirmValue;
                                                    const denyUi = confirmUi.denyUi.denyValue;
                                                    const style = confirmUi.style;
                                                    if (titleUi) {
                                                        confirm.title = {
                                                            type: 'plain_text',
                                                            text: titleUi.text,
                                                            emoji: titleUi.emoji,
                                                        };
                                                    }
                                                    if (textUi) {
                                                        confirm.text = {
                                                            type: 'plain_text',
                                                            text: textUi.text,
                                                            emoji: textUi.emoji,
                                                        };
                                                    }
                                                    if (confirmTextUi) {
                                                        confirm.confirm = {
                                                            type: 'plain_text',
                                                            text: confirmTextUi.text,
                                                            emoji: confirmTextUi.emoji,
                                                        };
                                                    }
                                                    if (denyUi) {
                                                        confirm.deny = {
                                                            type: 'plain_text',
                                                            text: denyUi.text,
                                                            emoji: denyUi.emoji,
                                                        };
                                                    }
                                                    if (style !== 'default') {
                                                        confirm.style = style;
                                                    }
                                                    accessory.confirm = confirm;
                                                }
                                            }
                                            block.accessory = accessory;
                                        }
                                    }
                                    blocks.push(block);
                                }
                                body.blocks = blocks;
                            }
                        }
                        else {
                            const attachmentsJson = this.getNodeParameter('attachmentsJson', i, '');
                            const blocksJson = this.getNodeParameter('blocksJson', i, []);
                            if (attachmentsJson !== '' && validateJSON(attachmentsJson) === undefined) {
                                throw new NodeOperationError(this.getNode(), 'Attachments it is not a valid json', {
                                    itemIndex: i,
                                });
                            }
                            if (blocksJson !== '' && validateJSON(blocksJson) === undefined) {
                                throw new NodeOperationError(this.getNode(), 'Blocks it is not a valid json', {
                                    itemIndex: i,
                                });
                            }
                            if (attachmentsJson !== '') {
                                body.attachments = attachmentsJson;
                            }
                            if (blocksJson !== '') {
                                body.blocks = blocksJson;
                            }
                        }
                        // Add all the other options to the request
                        const otherOptions = this.getNodeParameter('otherOptions', i);
                        Object.assign(body, otherOptions);
                        responseData = await slackApiRequest.call(this, 'POST', `/chat.${action}`, body, qs);
                    }
                    //https://api.slack.com/methods/chat.update
                    if (operation === 'update') {
                        const channel = this.getNodeParameter('channelId', i);
                        const text = this.getNodeParameter('text', i);
                        const ts = this.getNodeParameter('ts', i);
                        const attachments = this.getNodeParameter('attachments', i, []);
                        const body = {
                            channel,
                            text,
                            ts,
                        };
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
                        body.attachments = attachments;
                        const jsonParameters = this.getNodeParameter('jsonParameters', i, false);
                        if (jsonParameters) {
                            const blocksJson = this.getNodeParameter('blocksJson', i, []);
                            if (blocksJson !== '' && validateJSON(blocksJson) === undefined) {
                                throw new NodeOperationError(this.getNode(), 'Blocks it is not a valid json', {
                                    itemIndex: i,
                                });
                            }
                            if (blocksJson !== '') {
                                body.blocks = blocksJson;
                            }
                            const attachmentsJson = this.getNodeParameter('attachmentsJson', i, '');
                            if (attachmentsJson !== '' && validateJSON(attachmentsJson) === undefined) {
                                throw new NodeOperationError(this.getNode(), 'Attachments it is not a valid json', {
                                    itemIndex: i,
                                });
                            }
                            if (attachmentsJson !== '') {
                                body.attachments = attachmentsJson;
                            }
                        }
                        // Add all the other options to the request
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(body, updateFields);
                        responseData = await slackApiRequest.call(this, 'POST', '/chat.update', body, qs);
                    }
                    //https://api.slack.com/methods/chat.delete
                    if (operation === 'delete') {
                        const channel = this.getNodeParameter('channelId', i);
                        const timestamp = this.getNodeParameter('timestamp', i);
                        const body = {
                            channel,
                            ts: timestamp,
                        };
                        // Add all the other options to the request
                        responseData = await slackApiRequest.call(this, 'POST', '/chat.delete', body, qs);
                    }
                    //https://api.slack.com/methods/chat.getPermalink
                    if (operation === 'getPermalink') {
                        const channel = this.getNodeParameter('channelId', i);
                        const timestamp = this.getNodeParameter('timestamp', i);
                        const qs = {
                            channel,
                            message_ts: timestamp,
                        };
                        responseData = await slackApiRequest.call(this, 'GET', '/chat.getPermalink', {}, qs);
                    }
                }
                if (resource === 'reaction') {
                    const channel = this.getNodeParameter('channelId', i);
                    const timestamp = this.getNodeParameter('timestamp', i);
                    //https://api.slack.com/methods/reactions.add
                    if (operation === 'add') {
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            channel,
                            name,
                            timestamp,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/reactions.add', body, qs);
                    }
                    //https://api.slack.com/methods/reactions.remove
                    if (operation === 'remove') {
                        const name = this.getNodeParameter('name', i);
                        const body = {
                            channel,
                            name,
                            timestamp,
                        };
                        responseData = await slackApiRequest.call(this, 'POST', '/reactions.remove', body, qs);
                    }
                    //https://api.slack.com/methods/reactions.get
                    if (operation === 'get') {
                        qs.channel = channel;
                        qs.timestamp = timestamp;
                        responseData = await slackApiRequest.call(this, 'GET', '/reactions.get', {}, qs);
                    }
                }
                if (resource === 'star') {
                    //https://api.slack.com/methods/stars.add
                    if (operation === 'add') {
                        const options = this.getNodeParameter('options', i);
                        const body = {};
                        if (options.channelId) {
                            body.channel = options.channelId;
                        }
                        if (options.fileId) {
                            body.file = options.fileId;
                        }
                        if (options.fileComment) {
                            body.file_comment = options.fileComment;
                        }
                        if (options.timestamp) {
                            body.timestamp = options.timestamp;
                        }
                        responseData = await slackApiRequest.call(this, 'POST', '/stars.add', body, qs);
                    }
                    //https://api.slack.com/methods/stars.remove
                    if (operation === 'delete') {
                        const options = this.getNodeParameter('options', i);
                        const body = {};
                        if (options.channelId) {
                            body.channel = options.channelId;
                        }
                        if (options.fileId) {
                            body.file = options.fileId;
                        }
                        if (options.fileComment) {
                            body.file_comment = options.fileComment;
                        }
                        if (options.timestamp) {
                            body.timestamp = options.timestamp;
                        }
                        responseData = await slackApiRequest.call(this, 'POST', '/stars.remove', body, qs);
                    }
                    //https://api.slack.com/methods/stars.list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'items', 'GET', '/stars.list', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/stars.list', {}, qs);
                            responseData = responseData.items;
                        }
                    }
                }
                if (resource === 'file') {
                    //https://api.slack.com/methods/files.upload
                    if (operation === 'upload') {
                        const options = this.getNodeParameter('options', i);
                        const body = {};
                        if (options.channelIds) {
                            body.channels = toMultiOptionsCsv(options.channelIds);
                        }
                        if (options.fileName) {
                            body.filename = options.fileName;
                        }
                        if (options.initialComment) {
                            body.initial_comment = options.initialComment;
                        }
                        if (options.threadTs) {
                            body.thread_ts = options.threadTs;
                        }
                        if (options.title) {
                            body.title = options.title;
                        }
                        if (this.getNodeParameter('binaryData', i)) {
                            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                            const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                            body.file = {
                                value: binaryDataBuffer,
                                options: {
                                    filename: binaryData.fileName,
                                    contentType: binaryData.mimeType,
                                },
                            };
                            responseData = await slackApiRequest.call(this, 'POST', '/files.upload', {}, qs, { 'Content-Type': 'multipart/form-data' }, { formData: body });
                            responseData = responseData.file;
                        }
                        else {
                            const fileContent = this.getNodeParameter('fileContent', i);
                            body.content = fileContent;
                            responseData = await slackApiRequest.call(this, 'POST', '/files.upload', body, qs, { 'Content-Type': 'application/x-www-form-urlencoded' }, { form: body });
                            responseData = responseData.file;
                        }
                    }
                    //https://api.slack.com/methods/files.list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const filters = this.getNodeParameter('filters', i);
                        if (filters.channelId) {
                            qs.channel = filters.channelId;
                        }
                        if (filters.showFilesHidden) {
                            qs.show_files_hidden_by_limit = filters.showFilesHidden;
                        }
                        if (filters.tsFrom) {
                            qs.ts_from = filters.tsFrom;
                        }
                        if (filters.tsTo) {
                            qs.ts_to = filters.tsTo;
                        }
                        if (filters.types) {
                            qs.types = toMultiOptionsCsv(filters.types);
                        }
                        if (filters.userId) {
                            qs.user = filters.userId;
                        }
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'files', 'GET', '/files.list', {}, qs);
                        }
                        else {
                            qs.count = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/files.list', {}, qs);
                            responseData = responseData.files;
                        }
                    }
                    //https://api.slack.com/methods/files.info
                    if (operation === 'get') {
                        const fileId = this.getNodeParameter('fileId', i);
                        qs.file = fileId;
                        responseData = await slackApiRequest.call(this, 'GET', '/files.info', {}, qs);
                        responseData = responseData.file;
                    }
                }
                if (resource === 'user') {
                    //https://api.slack.com/methods/users.info
                    if (operation === 'info') {
                        qs.user = this.getNodeParameter('user', i);
                        responseData = await slackApiRequest.call(this, 'GET', '/users.info', {}, qs);
                        responseData = responseData.user;
                    }
                    //https://api.slack.com/methods/users.list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (returnAll) {
                            responseData = await slackApiRequestAllItems.call(this, 'members', 'GET', '/users.list', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await slackApiRequest.call(this, 'GET', '/users.list', {}, qs);
                            responseData = responseData.members;
                        }
                    }
                    //https://api.slack.com/methods/users.getPresence
                    if (operation === 'getPresence') {
                        qs.user = this.getNodeParameter('user', i);
                        responseData = await slackApiRequest.call(this, 'GET', '/users.getPresence', {}, qs);
                    }
                }
                if (resource === 'userGroup') {
                    //https://api.slack.com/methods/usergroups.create
                    if (operation === 'create') {
                        const name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            name,
                        };
                        Object.assign(body, additionalFields);
                        responseData = await slackApiRequest.call(this, 'POST', '/usergroups.create', body, qs);
                        responseData = responseData.usergroup;
                    }
                    //https://api.slack.com/methods/usergroups.enable
                    if (operation === 'enable') {
                        const userGroupId = this.getNodeParameter('userGroupId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            usergroup: userGroupId,
                        };
                        Object.assign(body, additionalFields);
                        responseData = await slackApiRequest.call(this, 'POST', '/usergroups.enable', body, qs);
                        responseData = responseData.usergroup;
                    }
                    //https://api.slack.com/methods/usergroups.disable
                    if (operation === 'disable') {
                        const userGroupId = this.getNodeParameter('userGroupId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            usergroup: userGroupId,
                        };
                        Object.assign(body, additionalFields);
                        responseData = await slackApiRequest.call(this, 'POST', '/usergroups.disable', body, qs);
                        responseData = responseData.usergroup;
                    }
                    //https://api.slack.com/methods/usergroups.list
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const qs = {};
                        Object.assign(qs, additionalFields);
                        responseData = await slackApiRequest.call(this, 'GET', '/usergroups.list', {}, qs);
                        responseData = responseData.usergroups;
                        if (!returnAll) {
                            const limit = this.getNodeParameter('limit', i);
                            responseData = responseData.slice(0, limit);
                        }
                    }
                    //https://api.slack.com/methods/usergroups.update
                    if (operation === 'update') {
                        const userGroupId = this.getNodeParameter('userGroupId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {
                            usergroup: userGroupId,
                        };
                        Object.assign(body, updateFields);
                        responseData = await slackApiRequest.call(this, 'POST', '/usergroups.update', body, qs);
                        responseData = responseData.usergroup;
                    }
                }
                if (resource === 'userProfile') {
                    //https://api.slack.com/methods/users.profile.set
                    if (operation === 'update') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const timezone = this.getTimezone();
                        const body = {};
                        Object.assign(body, additionalFields);
                        if (body.status_expiration === undefined) {
                            body.status_expiration = 0;
                        }
                        else {
                            body.status_expiration = moment.tz(body.status_expiration, timezone).unix();
                        }
                        if (body.customFieldUi) {
                            const customFields = body.customFieldUi
                                .customFieldValues;
                            body.fields = {};
                            for (const customField of customFields) {
                                //@ts-ignore
                                body.fields[customField.id] = {
                                    value: customField.value,
                                    alt: customField.alt,
                                };
                            }
                        }
                        responseData = await slackApiRequest.call(this, 'POST', '/users.profile.set', { profile: body }, qs);
                        responseData = responseData.profile;
                    }
                    //https://api.slack.com/methods/users.profile.get
                    if (operation === 'get') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const qs = {};
                        Object.assign(qs, additionalFields);
                        responseData = await slackApiRequest.call(this, 'POST', '/users.profile.get', undefined, qs);
                        responseData = responseData.profile;
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=SlackV1.node.js.map