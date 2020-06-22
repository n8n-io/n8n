import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	zoomApiRequest,
	zoomApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import {
	meetingOperations,
	meetingFields,
} from './MeetingDescription';

import {
	meetingRegistrantOperations,
	meetingRegistrantFields,

} from './MeetingRegistrantDescription';

import * as moment from 'moment-timezone';

interface Settings {
	host_video?: boolean;
	participant_video?: boolean;
	cn_meeting?: boolean;
	in_meeting?: boolean;
	join_before_host?: boolean;
	mute_upon_entry?: boolean;
	watermark?: boolean;
	audio?: string;
	alternative_hosts?: string;
	auto_recording?: string;
	registration_type?: number;

}
export class Zoom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoom',
		name: 'zoom',
		group: ['input'],
		version: 1,
		description: 'Consume Zoom API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Zoom',
			color: '#0B6CF9'
		},
		icon: 'file:zoom.png',
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zoomApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'zoomOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
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
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Meeting',
						value: 'meeting'
					},
					{
						name: 'Meeting Registrants',
						value: 'meetingRegistrants'
					}
				],
				default: 'meeting',
				description: 'The resource to operate on.'
			},
			...meetingOperations,
			...meetingFields,
			...meetingRegistrantOperations,
			...meetingRegistrantFields,
		]

	};
	methods = {
		loadOptions: {
			// Get all the timezones to display them to user so that he can select them easily
			async getTimezones(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId
					});
				}
				return returnData;
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let qs: IDataObject;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		console.log(this.getCredentials('zoomOAuth2Api'));
		let body: IDataObject = {};
		for (let i = 0; i < length; i++) {
			qs = {};
			if (resource === 'meeting') {

				if (operation === 'get') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meeting
					const userId = this.getNodeParameter('userId', i) as string;

					responseData = await zoomApiRequest.call(
						this,
						'GET',
						`/meetings/${userId}`,
						{},
						qs
					);
				}
				if (operation === 'getAll') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetings
					const userId = this.getNodeParameter('userId', i) as string;

					responseData = await zoomApiRequest.call(
						this,
						'GET',
						`/users/${userId}/meetings`,
						{},
						qs
					);
				}
				if (operation === 'delete') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingdelete
					const meetingId = this.getNodeParameter('meetingId', i) as string;
					responseData = await zoomApiRequest.call(
						this,
						'DELETE',
						`/meetings/${meetingId}`,
						{},
						qs
					);
					responseData = { success: true };
				}
				if (operation === 'create') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
					const userId = this.getNodeParameter('userId', i) as string;
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					const settings: Settings = {};
					if (additionalFields.cn_meeting) {
						settings.cn_meeting = additionalFields.cn_meeting as boolean;

					}

					if (additionalFields.in_meeting) {
						settings.in_meeting = additionalFields.in_meeting as boolean;

					}

					if (additionalFields.join_before_host) {
						settings.join_before_host = additionalFields.join_before_host as boolean;

					}

					if (additionalFields.mute_upon_entry) {
						settings.mute_upon_entry = additionalFields.mute_upon_entry as boolean;

					}

					if (additionalFields.watermark) {
						settings.watermark = additionalFields.watermark as boolean;

					}

					if (additionalFields.audio) {
						settings.audio = additionalFields.audio as string;

					}

					if (additionalFields.alternative_hosts) {
						settings.alternative_hosts = additionalFields.alternative_hosts as string;

					}

					if (additionalFields.participant_video) {
						settings.participant_video = additionalFields.participant_video as boolean;

					}

					if (additionalFields.host_video) {
						settings.host_video = additionalFields.host_video as boolean;

					}

					if (additionalFields.auto_recording) {
						settings.auto_recording = additionalFields.auto_recording as string;

					}

					if (additionalFields.registration_type) {
						settings.registration_type = additionalFields.registration_type as number;

					}

					body = {
						settings,
					};

					if (additionalFields.topic) {
						body.topic = additionalFields.topic as string;

					}

					if (additionalFields.type) {
						body.type = additionalFields.type as string;

					}

					if (additionalFields.startTime) {
						body.start_time = additionalFields.startTime as string;

					}

					if (additionalFields.duration) {
						body.duration = additionalFields.duration as number;

					}

					if (additionalFields.scheduleFor) {
						body.schedule_for = additionalFields.scheduleFor as string;

					}

					if (additionalFields.timeZone) {
						body.timezone = additionalFields.timeZone as string;

					}

					if (additionalFields.password) {
						body.password = additionalFields.password as string;

					}

					if (additionalFields.agenda) {
						body.agenda = additionalFields.agenda as string;

					}




					responseData = await zoomApiRequest.call(
						this,
						'POST',
						`/users/${userId}/meetings`,
						body,
						qs
					);
				}
				if (operation === 'update') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingupdate
					const meetingId = this.getNodeParameter('meetingId', i) as string;
					qs.occurence_id = this.getNodeParameter('occurenceId', i) as string;
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					const settings: Settings = {};
					if (additionalFields.cn_meeting) {
						settings.cn_meeting = additionalFields.cn_meeting as boolean;

					}

					if (additionalFields.in_meeting) {
						settings.in_meeting = additionalFields.in_meeting as boolean;

					}

					if (additionalFields.join_before_host) {
						settings.join_before_host = additionalFields.join_before_host as boolean;

					}

					if (additionalFields.mute_upon_entry) {
						settings.mute_upon_entry = additionalFields.mute_upon_entry as boolean;

					}

					if (additionalFields.watermark) {
						settings.watermark = additionalFields.watermark as boolean;

					}

					if (additionalFields.audio) {
						settings.audio = additionalFields.audio as string;

					}

					if (additionalFields.alternative_hosts) {
						settings.alternative_hosts = additionalFields.alternative_hosts as string;

					}

					if (additionalFields.participant_video) {
						settings.participant_video = additionalFields.participant_video as boolean;

					}

					if (additionalFields.host_video) {
						settings.host_video = additionalFields.host_video as boolean;

					}

					if (additionalFields.auto_recording) {
						settings.auto_recording = additionalFields.auto_recording as string;

					}

					if (additionalFields.registration_type) {
						settings.registration_type = additionalFields.registration_type as number;

					}

					body = {
						settings,
					};
					if (additionalFields.topic) {
						body.topic = additionalFields.topic as string;

					}

					if (additionalFields.type) {
						body.type = additionalFields.type as string;

					}

					if (additionalFields.startTime) {
						body.start_time = additionalFields.startTime as string;

					}

					if (additionalFields.duration) {
						body.duration = additionalFields.duration as number;

					}

					if (additionalFields.scheduleFor) {
						body.schedule_for = additionalFields.scheduleFor as string;

					}

					if (additionalFields.timeZone) {
						body.timezone = additionalFields.timeZone as string;

					}

					if (additionalFields.password) {
						body.password = additionalFields.password as string;

					}

					if (additionalFields.agenda) {
						body.agenda = additionalFields.agenda as string;

					}

					responseData = await zoomApiRequest.call(
						this,
						'PATCH',
						`/meetings/${meetingId}`,
						body,
						qs
					);
				}
			}
			if (resource === 'meetingRegistrant') {
				if (operation === 'create') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingregistrantcreate
					const meetingId = this.getNodeParameter('meetingId', i) as string;
					qs.occurence_id = this.getNodeParameter('occurenceId', i) as string;
					responseData = await zoomApiRequest.call(
						this,
						'PATCH',
						`/meetings/${meetingId}/registrants`,
						body,
						qs
					);
				}
				if (operation === 'getAll') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingregistrants
				}
				if (operation === 'update') {
					//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingregistrantstatus
				}
			}
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else {
			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
