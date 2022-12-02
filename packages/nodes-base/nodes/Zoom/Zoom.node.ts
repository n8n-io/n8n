import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { zoomApiRequest, zoomApiRequestAllItems } from './GenericFunctions';

import { meetingFields, meetingOperations } from './MeetingDescription';

// import {
// 	meetingRegistrantOperations,
// 	meetingRegistrantFields,
// } from './MeetingRegistrantDescription';

// import {
// 	webinarOperations,
// 	webinarFields,
// } from './WebinarDescription';

import moment from 'moment-timezone';

interface Settings {
	host_video?: boolean;
	participant_video?: boolean;
	panelists_video?: boolean;
	cn_meeting?: boolean;
	in_meeting?: boolean;
	join_before_host?: boolean;
	mute_upon_entry?: boolean;
	watermark?: boolean;
	waiting_room?: boolean;
	audio?: string;
	alternative_hosts?: string;
	auto_recording?: string;
	registration_type?: number;
	approval_type?: number;
	practice_session?: boolean;
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
		},
		icon: 'file:zoom.svg',
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				// create a JWT app on Zoom Marketplace
				//https://marketplace.zoom.us/develop/create
				//get the JWT token as access token
				name: 'zoomApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				//create a account level OAuth app
				//https://marketplace.zoom.us/develop/create
				name: 'zoomOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Meeting',
						value: 'meeting',
					},
					// {
					// 	name: 'Meeting Registrant',
					// 	value: 'meetingRegistrant'
					// },
					// {
					// 	name: 'Webinar',
					// 	value: 'webinar'
					// }
				],
				default: 'meeting',
			},
			//MEETINGS
			...meetingOperations,
			...meetingFields,

			// 	//MEETING REGISTRANTS
			// 	...meetingRegistrantOperations,
			// 	...meetingRegistrantFields,

			// 	//WEBINARS
			// 	...webinarOperations,
			// 	...webinarFields,
		],
	};
	methods = {
		loadOptions: {
			// Get all the timezones to display them to user so that he can select them easily
			async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				qs = {};
				//https://marketplace.zoom.us/docs/api-reference/zoom-api/
				if (resource === 'meeting') {
					if (operation === 'get') {
						//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meeting
						const meetingId = this.getNodeParameter('meetingId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.showPreviousOccurrences) {
							qs.show_previous_occurrences = additionalFields.showPreviousOccurrences as boolean;
						}

						if (additionalFields.occurrenceId) {
							qs.occurrence_id = additionalFields.occurrenceId as string;
						}

						responseData = await zoomApiRequest.call(this, 'GET', `/meetings/${meetingId}`, {}, qs);
					}
					if (operation === 'getAll') {
						//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetings
						const returnAll = this.getNodeParameter('returnAll', i);

						const filters = this.getNodeParameter('filters', i);
						if (filters.type) {
							qs.type = filters.type as string;
						}

						if (returnAll) {
							responseData = await zoomApiRequestAllItems.call(
								this,
								'meetings',
								'GET',
								'/users/me/meetings',
								{},
								qs,
							);
						} else {
							qs.page_size = this.getNodeParameter('limit', i);
							responseData = await zoomApiRequest.call(this, 'GET', '/users/me/meetings', {}, qs);
							responseData = responseData.meetings;
						}
					}
					if (operation === 'delete') {
						//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingdelete
						const meetingId = this.getNodeParameter('meetingId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						if (additionalFields.scheduleForReminder) {
							qs.schedule_for_reminder = additionalFields.scheduleForReminder as boolean;
						}

						if (additionalFields.occurrenceId) {
							qs.occurrence_id = additionalFields.occurrenceId;
						}

						responseData = await zoomApiRequest.call(
							this,
							'DELETE',
							`/meetings/${meetingId}`,
							{},
							qs,
						);
						responseData = { success: true };
					}
					if (operation === 'create') {
						//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {};

						if (additionalFields.settings) {
							const settingValues: Settings = {};
							const settings = additionalFields.settings as IDataObject;

							if (settings.cnMeeting) {
								settingValues.cn_meeting = settings.cnMeeting as boolean;
							}

							if (settings.inMeeting) {
								settingValues.in_meeting = settings.inMeeting as boolean;
							}

							if (settings.joinBeforeHost) {
								settingValues.join_before_host = settings.joinBeforeHost as boolean;
							}

							if (settings.muteUponEntry) {
								settingValues.mute_upon_entry = settings.muteUponEntry as boolean;
							}

							if (settings.watermark) {
								settingValues.watermark = settings.watermark as boolean;
							}

							if (settings.audio) {
								settingValues.audio = settings.audio as string;
							}

							if (settings.alternativeHosts) {
								settingValues.alternative_hosts = settings.alternativeHosts as string;
							}

							if (settings.participantVideo) {
								settingValues.participant_video = settings.participantVideo as boolean;
							}

							if (settings.hostVideo) {
								settingValues.host_video = settings.hostVideo as boolean;
							}

							if (settings.autoRecording) {
								settingValues.auto_recording = settings.autoRecording as string;
							}

							if (settings.registrationType) {
								settingValues.registration_type = settings.registrationType as number;
							}

							body.settings = settingValues;
						}

						body.topic = this.getNodeParameter('topic', i) as string;

						if (additionalFields.type) {
							body.type = additionalFields.type as string;
						}

						if (additionalFields.startTime) {
							if (additionalFields.timeZone) {
								body.start_time = moment(additionalFields.startTime as string).format(
									'YYYY-MM-DDTHH:mm:ss',
								);
							} else {
								// if none timezone it's defined used n8n timezone
								body.start_time = moment
									.tz(additionalFields.startTime as string, this.getTimezone())
									.format();
							}
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

						responseData = await zoomApiRequest.call(this, 'POST', `/users/me/meetings`, body, qs);
					}
					if (operation === 'update') {
						//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingupdate
						const meetingId = this.getNodeParameter('meetingId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {};

						if (updateFields.settings) {
							const settingValues: Settings = {};
							const settings = updateFields.settings as IDataObject;

							if (settings.cnMeeting) {
								settingValues.cn_meeting = settings.cnMeeting as boolean;
							}

							if (settings.inMeeting) {
								settingValues.in_meeting = settings.inMeeting as boolean;
							}

							if (settings.joinBeforeHost) {
								settingValues.join_before_host = settings.joinBeforeHost as boolean;
							}

							if (settings.muteUponEntry) {
								settingValues.mute_upon_entry = settings.muteUponEntry as boolean;
							}

							if (settings.watermark) {
								settingValues.watermark = settings.watermark as boolean;
							}

							if (settings.audio) {
								settingValues.audio = settings.audio as string;
							}

							if (settings.alternativeHosts) {
								settingValues.alternative_hosts = settings.alternativeHosts as string;
							}

							if (settings.participantVideo) {
								settingValues.participant_video = settings.participantVideo as boolean;
							}

							if (settings.hostVideo) {
								settingValues.host_video = settings.hostVideo as boolean;
							}

							if (settings.autoRecording) {
								settingValues.auto_recording = settings.autoRecording as string;
							}

							if (settings.registrationType) {
								settingValues.registration_type = settings.registrationType as number;
							}

							body.settings = settingValues;
						}

						if (updateFields.topic) {
							body.topic = updateFields.topic as string;
						}

						if (updateFields.type) {
							body.type = updateFields.type as string;
						}

						if (updateFields.startTime) {
							body.start_time = updateFields.startTime as string;
						}

						if (updateFields.duration) {
							body.duration = updateFields.duration as number;
						}

						if (updateFields.scheduleFor) {
							body.schedule_for = updateFields.scheduleFor as string;
						}

						if (updateFields.timeZone) {
							body.timezone = updateFields.timeZone as string;
						}

						if (updateFields.password) {
							body.password = updateFields.password as string;
						}

						if (updateFields.agenda) {
							body.agenda = updateFields.agenda as string;
						}

						responseData = await zoomApiRequest.call(
							this,
							'PATCH',
							`/meetings/${meetingId}`,
							body,
							qs,
						);

						responseData = { success: true };
					}
				}
				// if (resource === 'meetingRegistrant') {
				// 	if (operation === 'create') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingregistrantcreate
				// 		const meetingId = this.getNodeParameter('meetingId', i) as string;
				// 		const emailId = this.getNodeParameter('email', i) as string;
				// 		body.email = emailId;
				// 		const firstName = this.getNodeParameter('firstName', i) as string;
				// 		body.first_name = firstName;
				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;
				// 		if (additionalFields.occurrenceId) {
				// 			qs.occurrence_ids = additionalFields.occurrenceId as string;
				// 		}
				// 		if (additionalFields.lastName) {
				// 			body.last_name = additionalFields.lastName as string;
				// 		}
				// 		if (additionalFields.address) {
				// 			body.address = additionalFields.address as string;
				// 		}
				// 		if (additionalFields.city) {
				// 			body.city = additionalFields.city as string;
				// 		}
				// 		if (additionalFields.state) {
				// 			body.state = additionalFields.state as string;
				// 		}
				// 		if (additionalFields.country) {
				// 			body.country = additionalFields.country as string;
				// 		}
				// 		if (additionalFields.zip) {
				// 			body.zip = additionalFields.zip as string;
				// 		}
				// 		if (additionalFields.phone) {
				// 			body.phone = additionalFields.phone as string;
				// 		}
				// 		if (additionalFields.comments) {
				// 			body.comments = additionalFields.comments as string;
				// 		}
				// 		if (additionalFields.org) {
				// 			body.org = additionalFields.org as string;
				// 		}
				// 		if (additionalFields.jobTitle) {
				// 			body.job_title = additionalFields.jobTitle as string;
				// 		}
				// 		if (additionalFields.purchasingTimeFrame) {
				// 			body.purchasing_time_frame = additionalFields.purchasingTimeFrame as string;
				// 		}
				// 		if (additionalFields.roleInPurchaseProcess) {
				// 			body.role_in_purchase_process = additionalFields.roleInPurchaseProcess as string;
				// 		}
				// 		responseData = await zoomApiRequest.call(
				// 			this,
				// 			'POST',
				// 			`/meetings/${meetingId}/registrants`,
				// 			body,
				// 			qs
				// 		);
				// 	}
				// 	if (operation === 'getAll') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingregistrants
				// 		const meetingId = this.getNodeParameter('meetingId', i) as string;
				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;
				// 		if (additionalFields.occurrenceId) {
				// 			qs.occurrence_id = additionalFields.occurrenceId as string;
				// 		}
				// 		if (additionalFields.status) {
				// 			qs.status = additionalFields.status as string;
				// 		}
				// 		const returnAll = this.getNodeParameter('returnAll', i);
				// 		if (returnAll) {
				// 			responseData = await zoomApiRequestAllItems.call(this, 'results', 'GET', `/meetings/${meetingId}/registrants`, {}, qs);
				// 		} else {
				// 			qs.page_size = this.getNodeParameter('limit', i);
				// 			responseData = await zoomApiRequest.call(this, 'GET', `/meetings/${meetingId}/registrants`, {}, qs);

				// 		}

				// 	}
				// 	if (operation === 'update') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingregistrantstatus
				// 		const meetingId = this.getNodeParameter('meetingId', i) as string;
				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;
				// 		if (additionalFields.occurrenceId) {
				// 			qs.occurrence_id = additionalFields.occurrenceId as string;
				// 		}
				// 		if (additionalFields.action) {
				// 			body.action = additionalFields.action as string;
				// 		}
				// 		responseData = await zoomApiRequest.call(
				// 			this,
				// 			'PUT',
				// 			`/meetings/${meetingId}/registrants/status`,
				// 			body,
				// 			qs
				// 		);
				// 	}
				// }
				// if (resource === 'webinar') {
				// 	if (operation === 'create') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/webinars/webinarcreate
				// 		const userId = this.getNodeParameter('userId', i) as string;
				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;
				// 		const settings: Settings = {};

				// 		if (additionalFields.audio) {
				// 			settings.audio = additionalFields.audio as string;

				// 		}

				// 		if (additionalFields.alternativeHosts) {
				// 			settings.alternative_hosts = additionalFields.alternativeHosts as string;

				// 		}

				// 		if (additionalFields.panelistsVideo) {
				// 			settings.panelists_video = additionalFields.panelistsVideo as boolean;

				// 		}
				// 		if (additionalFields.hostVideo) {
				// 			settings.host_video = additionalFields.hostVideo as boolean;

				// 		}
				// 		if (additionalFields.practiceSession) {
				// 			settings.practice_session = additionalFields.practiceSession as boolean;

				// 		}
				// 		if (additionalFields.autoRecording) {
				// 			settings.auto_recording = additionalFields.autoRecording as string;

				// 		}

				// 		if (additionalFields.registrationType) {
				// 			settings.registration_type = additionalFields.registrationType as number;

				// 		}
				// 		if (additionalFields.approvalType) {
				// 			settings.approval_type = additionalFields.approvalType as number;

				// 		}

				// 		body = {
				// 			settings,
				// 		};

				// 		if (additionalFields.topic) {
				// 			body.topic = additionalFields.topic as string;

				// 		}

				// 		if (additionalFields.type) {
				// 			body.type = additionalFields.type as string;

				// 		}

				// 		if (additionalFields.startTime) {
				// 			body.start_time = additionalFields.startTime as string;

				// 		}

				// 		if (additionalFields.duration) {
				// 			body.duration = additionalFields.duration as number;

				// 		}

				// 		if (additionalFields.timeZone) {
				// 			body.timezone = additionalFields.timeZone as string;

				// 		}

				// 		if (additionalFields.password) {
				// 			body.password = additionalFields.password as string;

				// 		}

				// 		if (additionalFields.agenda) {
				// 			body.agenda = additionalFields.agenda as string;

				// 		}
				// 		responseData = await zoomApiRequest.call(
				// 			this,
				// 			'POST',
				// 			`/users/${userId}/webinars`,
				// 			body,
				// 			qs
				// 		);
				// 	}
				// 	if (operation === 'get') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/webinars/webinar
				// 		const webinarId = this.getNodeParameter('webinarId', i) as string;

				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;
				// 		if (additionalFields.showPreviousOccurrences) {
				// 			qs.show_previous_occurrences = additionalFields.showPreviousOccurrences as boolean;

				// 		}

				// 		if (additionalFields.occurrenceId) {
				// 			qs.occurrence_id = additionalFields.occurrenceId as string;

				// 		}

				// 		responseData = await zoomApiRequest.call(
				// 			this,
				// 			'GET',
				// 			`/webinars/${webinarId}`,
				// 			{},
				// 			qs
				// 		);
				// 	}
				// 	if (operation === 'getAll') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/webinars/webinars
				// 		const userId = this.getNodeParameter('userId', i) as string;
				// 		const returnAll = this.getNodeParameter('returnAll', i);
				// 		if (returnAll) {
				// 			responseData = await zoomApiRequestAllItems.call(this, 'results', 'GET', `/users/${userId}/webinars`, {}, qs);
				// 		} else {
				// 			qs.page_size = this.getNodeParameter('limit', i);
				// 			responseData = await zoomApiRequest.call(this, 'GET', `/users/${userId}/webinars`, {}, qs);

				// 		}
				// 	}
				// 	if (operation === 'delete') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/webinars/webinardelete
				// 		const webinarId = this.getNodeParameter('webinarId', i) as string;
				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;

				// 		if (additionalFields.occurrenceId) {
				// 			qs.occurrence_id = additionalFields.occurrenceId;

				// 		}

				// 		responseData = await zoomApiRequest.call(
				// 			this,
				// 			'DELETE',
				// 			`/webinars/${webinarId}`,
				// 			{},
				// 			qs
				// 		);
				// 		responseData = { success: true };
				// 	}
				// 	if (operation === 'update') {
				// 		//https://marketplace.zoom.us/docs/api-reference/zoom-api/webinars/webinarupdate
				// 		const webinarId = this.getNodeParameter('webinarId', i) as string;
				// 		const additionalFields = this.getNodeParameter(
				// 			'additionalFields',
				// 			i
				// 		) as IDataObject;
				// 		if (additionalFields.occurrenceId) {
				// 			qs.occurrence_id = additionalFields.occurrenceId as string;

				// 		}
				// 		const settings: Settings = {};
				// 		if (additionalFields.audio) {
				// 			settings.audio = additionalFields.audio as string;

				// 		}
				// 		if (additionalFields.alternativeHosts) {
				// 			settings.alternative_hosts = additionalFields.alternativeHosts as string;

				// 		}

				// 		if (additionalFields.panelistsVideo) {
				// 			settings.panelists_video = additionalFields.panelistsVideo as boolean;

				// 		}
				// 		if (additionalFields.hostVideo) {
				// 			settings.host_video = additionalFields.hostVideo as boolean;

				// 		}
				// 		if (additionalFields.practiceSession) {
				// 			settings.practice_session = additionalFields.practiceSession as boolean;

				// 		}
				// 		if (additionalFields.autoRecording) {
				// 			settings.auto_recording = additionalFields.autoRecording as string;

				// 		}

				// 		if (additionalFields.registrationType) {
				// 			settings.registration_type = additionalFields.registrationType as number;

				// 		}
				// 		if (additionalFields.approvalType) {
				// 			settings.approval_type = additionalFields.approvalType as number;

				// 		}

				// 		body = {
				// 			settings,
				// 		};

				// 		if (additionalFields.topic) {
				// 			body.topic = additionalFields.topic as string;

				// 		}

				// 		if (additionalFields.type) {
				// 			body.type = additionalFields.type as string;

				// 		}

				// 		if (additionalFields.startTime) {
				// 			body.start_time = additionalFields.startTime as string;

				// 		}

				// 		if (additionalFields.duration) {
				// 			body.duration = additionalFields.duration as number;

				// 		}

				// 		if (additionalFields.timeZone) {
				// 			body.timezone = additionalFields.timeZone as string;

				// 		}

				// 		if (additionalFields.password) {
				// 			body.password = additionalFields.password as string;

				// 		}

				// 		if (additionalFields.agenda) {
				// 			body.agenda = additionalFields.agenda as string;

				// 		}
				// 		responseData = await zoomApiRequest.call(
				// 			this,
				// 			'PATCH',
				// 			`webinars/${webinarId}`,
				// 			body,
				// 			qs
				// 		);
				// 	}
				// }
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = {
						json: {} as IDataObject,
						error: error.message,
						itemIndex: i,
					};
					returnData.push(executionErrorData as INodeExecutionData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
