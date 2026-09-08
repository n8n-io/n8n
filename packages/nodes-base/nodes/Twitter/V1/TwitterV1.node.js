import ISO6391 from 'iso-639-1';
import { NodeConnectionTypes } from 'n8n-workflow';
import { directMessageFields, directMessageOperations } from './DirectMessageDescription';
import { twitterApiRequest, twitterApiRequestAllItems, uploadAttachments, } from './GenericFunctions';
import { tweetFields, tweetOperations } from './TweetDescription';
export class TwitterV1 {
    description;
    constructor(baseDecription) {
        this.description = {
            ...baseDecription,
            version: 1,
            description: 'Consume Twitter API',
            subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
            defaults: {
                name: 'Twitter',
            },
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'twitterOAuth1Api',
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
                            name: 'Direct Message',
                            value: 'directMessage',
                        },
                        {
                            name: 'Tweet',
                            value: 'tweet',
                        },
                    ],
                    default: 'tweet',
                },
                // DIRECT MESSAGE
                ...directMessageOperations,
                ...directMessageFields,
                // TWEET
                ...tweetOperations,
                ...tweetFields,
            ],
        };
    }
    methods = {
        loadOptions: {
            // Get all the available languages to display them to user so that they can
            // select them easily
            async getLanguages() {
                const returnData = [];
                const languages = ISO6391.getAllNames();
                for (const language of languages) {
                    const languageName = language;
                    const languageId = ISO6391.getCode(language);
                    returnData.push({
                        name: languageName,
                        value: languageId,
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
                if (resource === 'directMessage') {
                    //https://developer.twitter.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/new-event
                    if (operation === 'create') {
                        const userId = this.getNodeParameter('userId', i);
                        const text = this.getNodeParameter('text', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            type: 'message_create',
                            message_create: {
                                target: {
                                    recipient_id: userId,
                                },
                                message_data: {
                                    text,
                                    attachment: {},
                                },
                            },
                        };
                        if (additionalFields.attachment) {
                            const attachment = additionalFields.attachment;
                            const attachmentProperties = attachment.split(',').map((propertyName) => {
                                return propertyName.trim();
                            });
                            const medias = await uploadAttachments.call(this, attachmentProperties, i);
                            body.message_create.message_data.attachment = {
                                type: 'media',
                                //@ts-ignore
                                media: { id: medias[0].media_id_string },
                            };
                        }
                        else {
                            delete body.message_create.message_data.attachment;
                        }
                        responseData = await twitterApiRequest.call(this, 'POST', '/direct_messages/events/new.json', { event: body });
                        responseData = responseData.event;
                    }
                }
                if (resource === 'tweet') {
                    // https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update
                    if (operation === 'create') {
                        const text = this.getNodeParameter('text', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            status: text,
                        };
                        if (additionalFields.inReplyToStatusId) {
                            body.in_reply_to_status_id = additionalFields.inReplyToStatusId;
                            body.auto_populate_reply_metadata = true;
                        }
                        if (additionalFields.attachments) {
                            const attachments = additionalFields.attachments;
                            const attachmentProperties = attachments.split(',').map((propertyName) => {
                                return propertyName.trim();
                            });
                            const medias = await uploadAttachments.call(this, attachmentProperties, i);
                            body.media_ids = medias
                                .map((media) => media.media_id_string)
                                .join(',');
                        }
                        if (additionalFields.possiblySensitive) {
                            body.possibly_sensitive = additionalFields.possiblySensitive;
                        }
                        if (additionalFields.displayCoordinates) {
                            body.display_coordinates = additionalFields.displayCoordinates;
                        }
                        if (additionalFields.locationFieldsUi) {
                            const locationUi = additionalFields.locationFieldsUi;
                            if (locationUi.locationFieldsValues) {
                                const values = locationUi.locationFieldsValues;
                                body.lat = parseFloat(values.latitude);
                                body.long = parseFloat(values.longitude);
                            }
                        }
                        responseData = await twitterApiRequest.call(this, 'POST', '/statuses/update.json', {}, body);
                    }
                    // https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-destroy-id
                    if (operation === 'delete') {
                        const tweetId = this.getNodeParameter('tweetId', i);
                        responseData = await twitterApiRequest.call(this, 'POST', `/statuses/destroy/${tweetId}.json`, {}, {});
                    }
                    // https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets
                    if (operation === 'search') {
                        const q = this.getNodeParameter('searchText', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const qs = {
                            q,
                        };
                        if (additionalFields.includeEntities) {
                            qs.include_entities = additionalFields.includeEntities;
                        }
                        if (additionalFields.resultType) {
                            qs.response_type = additionalFields.resultType;
                        }
                        if (additionalFields.until) {
                            qs.until = additionalFields.until;
                        }
                        if (additionalFields.lang) {
                            qs.lang = additionalFields.lang;
                        }
                        if (additionalFields.locationFieldsUi) {
                            const locationUi = additionalFields.locationFieldsUi;
                            if (locationUi.locationFieldsValues) {
                                const values = locationUi.locationFieldsValues;
                                qs.geocode = `${values.latitude},${values.longitude},${values.distance}${values.radius}`;
                            }
                        }
                        qs.tweet_mode = additionalFields.tweetMode || 'compat';
                        if (returnAll) {
                            responseData = await twitterApiRequestAllItems.call(this, 'statuses', 'GET', '/search/tweets.json', {}, qs);
                        }
                        else {
                            qs.count = this.getNodeParameter('limit', 0);
                            responseData = await twitterApiRequest.call(this, 'GET', '/search/tweets.json', {}, qs);
                            responseData = responseData.statuses;
                        }
                    }
                    //https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-favorites-create
                    if (operation === 'like') {
                        const tweetId = this.getNodeParameter('tweetId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const qs = {
                            id: tweetId,
                        };
                        if (additionalFields.includeEntities) {
                            qs.include_entities = additionalFields.includeEntities;
                        }
                        responseData = await twitterApiRequest.call(this, 'POST', '/favorites/create.json', {}, qs);
                    }
                    //https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-retweet-id
                    if (operation === 'retweet') {
                        const tweetId = this.getNodeParameter('tweetId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const qs = {
                            id: tweetId,
                        };
                        if (additionalFields.trimUser) {
                            qs.trim_user = additionalFields.trimUser;
                        }
                        responseData = await twitterApiRequest.call(this, 'POST', `/statuses/retweet/${tweetId}.json`, {}, qs);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = {
                        json: {
                            error: error.message,
                        },
                    };
                    returnData.push(executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=TwitterV1.node.js.map