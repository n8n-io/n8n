import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	hootsuiteApiRequest,
	hootsuiteApiRequestAllItems,
} from './GenericFunctions';

import {
	memberOperations,
	memberFields,
} from './MemberDescription';

import {
	messageOperations,
	messageFields,
} from './MessageDescription';

import {
	commentFields,
	commentOperations,
} from './CommentDescription';

import {
	IMessageSchedule,
	ILocation,
	IPrivacy,
	IMedia,
} from './MessageInterface';

import {
	get,
} from 'lodash';

import {
	snakeCase,
 } from 'change-case';

export class Hootsuite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hootsuite',
		name: 'hootsuite',
		icon: 'file:hootsuite.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Hootsuite API.',
		defaults: {
			name: 'Hootsuite',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hootsuiteOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Member',
						value: 'member',
					},
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'member',
				description: 'The resource to operate on.',
			},
			//COMMENT
			...commentOperations,
			...commentFields,
			//MEMBER
			...memberOperations,
			...memberFields,
			//MESSAGE
			...messageOperations,
			...messageFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the organizations to display them to user so that he can
			// select them easily
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await hootsuiteApiRequest.call(this, 'GET', '/me/organizations', {});
				for (const organization of data) {
					const organizationName = organization.id;
					const organizationId = organization.id;
					returnData.push({
						name: organizationName,
						value: organizationId,
					});
				}
				return returnData;
			},
			// Get all the social profiles to display them to user so that he can
			// select them easily
			async getSocialProfiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await hootsuiteApiRequest.call(this, 'GET', '/socialProfiles', {});
				for (const socialProfile of data) {
					const socialProfileName = `${socialProfile.socialNetworkUsername} (${socialProfile.type})`;
					const socialProfileId = socialProfile.id;
					returnData.push({
						name: socialProfileName,
						value: socialProfileId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'message') {
				//https://platform.hootsuite.com/docs/api/index.html#operation/approveMessage
				if (operation === 'approve') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const sequenceNumber = this.getNodeParameter('sequenceNumber', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						sequenceNumber,
					};
					if (additionalFields.reviewerType) {
						body.reviewerType = additionalFields.reviewerType as string;
					}
					responseData = await hootsuiteApiRequest.call(this, 'POST', `/messages/${messageId}/approve`, body);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/scheduleMessage
				if (operation === 'schedule') {
					const text = this.getNodeParameter('text', i) as string;
					const socialProfileIds = this.getNodeParameter('socialProfileIds', i) as string[];
					const scheduledSendTime = this.getNodeParameter('scheduledSendTime', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IMessageSchedule = {
						socialProfileIds,
						text,
						scheduledSendTime,
					};
					if (additionalFields.locationFieldsUi) {
						const locationValues = (additionalFields.locationFieldsUi as IDataObject).locationFieldsValues as IDataObject;
						if (locationValues) {
							const location: ILocation = {};
							location.latitude = parseFloat(locationValues.latitude as string);
							location.longitude = parseFloat(locationValues.longitude as string);
							body.location = location;
						}
					}
					if (additionalFields.mediaUrls) {
						body.mediaUrls = additionalFields.mediaUrls as string[];
					}
					if (additionalFields.mediaUi) {
						body.media = [];
						const mediaValues = (additionalFields.mediaUi as IDataObject).mediaValues as IDataObject[];
						for (const media of mediaValues) {
							const mediaValue: IMedia = {};
							mediaValue.id = media.id as string;
							if (media.videoOptions) {
								const facebookValue  = get(media.videoOptions, 'facebookUi.facebookValues');
								if (facebookValue) {
									//@ts-ignore
									mediaValue.videoOptions = {
										facebook: {
											title: facebookValue.title as string,
											category: snakeCase(facebookValue.category as string).toUpperCase(),
										}
									};
								}
							}
							body.media?.push(mediaValue);
						}
					}
					if (additionalFields.emailNotification) {
						body.emailNotification = additionalFields.emailNotification as boolean;
					}
					const privacy: IPrivacy = {};
					if (additionalFields.facebookVisibility) {
						privacy.facebook = {
							visibility: additionalFields.facebookVisibility as string,
						};
					}
					if (additionalFields.linkedInVisibility) {
						privacy.linkedIn = {
							visibility: additionalFields.linkedInVisibility as string,
						};
					}
					if (Object.keys(privacy).length !== 0) {
						body.privacy = privacy;
					}

					if (additionalFields.mediaUrls) {
						body.mediaUrls = additionalFields.mediaUrls as string[];
					}
					if (additionalFields.tags) {
						body.tags = (additionalFields.tags as string).split(',');
					}
					if (additionalFields.webhookUrls) {
						body.webhookUrls = additionalFields.webhookUrls as string[];
					}
					responseData = await hootsuiteApiRequest.call(this, 'POST', '/messages', body);
					if (responseData.errors) {
						const errorMessages = responseData.errors.map((errorItem: IDataObject) => errorItem.message);

						throw new Error(`Hootsuite error response ${errorMessages.join('|')}`);
					}
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/deleteMessage
				if (operation === 'delete') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					responseData = await hootsuiteApiRequest.call(this, 'DELETE', `/messages/${messageId}`);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/retrieveMessage
				if (operation === 'get') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					responseData = await hootsuiteApiRequest.call(this, 'GET', `/messages/${messageId}`);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/retrieveMessages
				if (operation === 'getOutbound') {
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const startTime = this.getNodeParameter('startTime', 0) as string;
					const endTime = this.getNodeParameter('endTime', 0) as string;
					qs.startTime = startTime;
					qs.endTime = endTime;
					if (additionalFields.state) {
						qs.state = snakeCase(additionalFields.state as string).toUpperCase();
					}
					if (additionalFields.socialProfileIds) {
						qs.socialProfileIds = additionalFields.socialProfileIds as string[];
					}
					if (additionalFields.includeUnscheduledReviewMsgs) {
						qs.includeUnscheduledReviewMsgs = additionalFields.includeUnscheduledReviewMsgs as  boolean;
					}
					if (returnAll === true) {
						responseData = await hootsuiteApiRequestAllItems.call(this, 'data', 'GET', '/messages', {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as number;
						responseData = await hootsuiteApiRequest.call(this, 'GET', '/messages', {}, qs);
						responseData = responseData.data;
					}
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/rejectMessage
				if (operation === 'reject') {
					const messageId = this.getNodeParameter('messageId', i) as string;
					const reason = this.getNodeParameter('reason', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						reason,
					};
					if (additionalFields.reviewerType) {
						body.reviewerType = additionalFields.reviewerType as string;
					}
					responseData = await hootsuiteApiRequest.call(this, 'POST', `/messages/${messageId}/reject`, body);
					responseData = responseData.data;
				}
			}
			if (resource === 'member') {
				//https://platform.hootsuite.com/docs/api/index.html#operation/createMember
				if (operation === 'create') {
					const organizationIds = this.getNodeParameter('organizationIds', i) as [];
					const email = this.getNodeParameter('email', i) as string;
					const fullName = this.getNodeParameter('fullName', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						organizationIds,
						email,
						fullName,
					};
					if (additionalFields.bio) {
						body.bio = additionalFields.bio as string;
					}
					if (additionalFields.companyName) {
						body.companyName = additionalFields.companyName as string;
					}
					if (additionalFields.timezone) {
						body.timezone = additionalFields.timezone as string;
					}
					if (additionalFields.language) {
						body.language = additionalFields.language as string;
					}
					responseData = await hootsuiteApiRequest.call(this, 'POST', '/members', body);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/retrieveMember
				if (operation === 'get') {
					const memberId = this.getNodeParameter('memberId', i) as string;
					responseData = await hootsuiteApiRequest.call(this, 'GET', `/members/${memberId}`);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/retrieveMemberOrganizationsById
				if (operation === 'getOrganization') {
					const memberId = this.getNodeParameter('memberId', 0) as string;
					responseData = await hootsuiteApiRequest.call(this, 'GET', `/members/${memberId}/organizations`);
					responseData = responseData.data;
				}
			}
			if (resource === 'comment') {
				//https://platform.hootsuite.com/docs/api/index.html#operation/approveComment
				if (operation === 'approve') {
					const commentId = this.getNodeParameter('commentId', i) as string;
					const sequenceNumber = this.getNodeParameter('sequenceNumber', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						sequenceNumber,
					};
					if (additionalFields.reviewerType) {
						body.reviewerType = additionalFields.reviewerType as string;
					}

					responseData = await hootsuiteApiRequest.call(this, 'POST', `/comments/${commentId}/approve`, body);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/retrieveComment
				if (operation === 'get') {
					const commentId = this.getNodeParameter('commentId', i) as string;
					responseData = await hootsuiteApiRequest.call(this, 'GET', `/comments/${commentId}`);
					responseData = responseData.data;
				}
				//https://platform.hootsuite.com/docs/api/index.html#operation/rejectComment
				if (operation === 'reject') {
					const commentId = this.getNodeParameter('commentId', i) as string;
					const reason = this.getNodeParameter('reason', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						reason,
					};
					if (additionalFields.reviewerType) {
						body.reviewerType = additionalFields.reviewerType as string;
					}
					responseData = await hootsuiteApiRequest.call(this, 'POST', `/comments/${commentId}/reject`, body);
					responseData = responseData.data;
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
