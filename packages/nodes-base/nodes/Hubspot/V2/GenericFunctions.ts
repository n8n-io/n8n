import type { OptionsWithUri } from 'request';

import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import moment from 'moment';

export async function hubspotApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
): Promise<any> {
	let authenticationMethod = this.getNodeParameter('authentication', 0);

	if (this.getNode().type.includes('Trigger')) {
		authenticationMethod = 'developerApi';
	}

	const options: OptionsWithUri = {
		method,
		qs: query,
		headers: {},
		uri: uri || `https://api.hubapi.com${endpoint}`,
		body,
		json: true,
		useQuerystring: true,
	};

	try {
		if (authenticationMethod === 'apiKey' || authenticationMethod === 'appToken') {
			const credentialType = authenticationMethod === 'apiKey' ? 'hubspotApi' : 'hubspotAppToken';
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		} else if (authenticationMethod === 'developerApi') {
			if (endpoint.includes('webhooks')) {
				const credentials = await this.getCredentials('hubspotDeveloperApi');
				options.qs.hapikey = credentials.apiKey as string;
				return await this.helpers.request(options);
			} else {
				return await this.helpers.requestOAuth2.call(this, 'hubspotDeveloperApi', options, {
					tokenType: 'Bearer',
					includeCredentialsOnRefreshOnBody: true,
				});
			}
		} else {
			return await this.helpers.requestOAuth2.call(this, 'hubspotOAuth2Api', options, {
				tokenType: 'Bearer',
				includeCredentialsOnRefreshOnBody: true,
			});
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated hubspot endpoint
 * and return all results
 */
export async function hubspotApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = query.limit || 250;
	query.count = 100;
	body.limit = body.limit || 100;

	do {
		responseData = await hubspotApiRequest.call(this, method, endpoint, body, query);
		query.offset = responseData.offset;
		query.vidOffset = responseData['vid-offset'];
		//Used by Search endpoints
		if (responseData.paging) {
			body.after = responseData.paging.next.after;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		//ticket:getAll endpoint does not support setting a limit, so return once the limit is reached
		if (query.limit && query.limit <= returnData.length && endpoint.includes('/tickets/paged')) {
			return returnData;
		}
	} while (responseData.hasMore || responseData['has-more'] || responseData.paging);
	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}

export function clean(obj: any) {
	for (const propName in obj) {
		if (obj[propName] === null || obj[propName] === undefined || obj[propName] === '') {
			delete obj[propName];
		}
	}
	return obj;
}

export const propertyEvents = [
	'contact.propertyChange',
	'company.propertyChange',
	'deal.propertyChange',
];

export const contactFields = [
	{
		id: 'company_size',
		label: 'testingricardo',
	},
	{
		id: 'date',
		label: 'Date',
	},
	{
		id: 'date_of_birth',
		label: 'Date of birth',
	},
	{
		id: 'days_to_close',
		label: 'Days To Close',
	},
	{
		id: 'degree',
		label: 'Degree',
	},
	{
		id: 'field_of_study',
		label: 'Field of study',
	},
	{
		id: 'first_conversion_date',
		label: 'First Conversion Date',
	},
	{
		id: 'first_conversion_event_name',
		label: 'First Conversion',
	},
	{
		id: 'first_deal_created_date',
		label: 'First Deal Created Date',
	},
	{
		id: 'gender',
		label: 'Gender',
	},
	{
		id: 'graduation_date',
		label: 'Graduation date',
	},
	{
		id: 'hs_additional_emails',
		label: 'Additional email addresses',
	},
	{
		id: 'hs_all_contact_vids',
		label: 'All vids for a contact',
	},
	{
		id: 'hs_analytics_first_touch_converting_campaign',
		label: 'First Touch Converting Campaign',
	},
	{
		id: 'hs_analytics_last_touch_converting_campaign',
		label: 'Last Touch Converting Campaign',
	},
	{
		id: 'hs_avatar_filemanager_key',
		label: 'Avatar FileManager key',
	},
	{
		id: 'hs_buying_role',
		label: 'Buying Role',
	},
	{
		id: 'hs_calculated_form_submissions',
		label: 'All form submissions for a contact',
	},
	{
		id: 'hs_calculated_merged_vids',
		label: 'Merged vids with timestamps of a contact',
	},
	{
		id: 'hs_calculated_mobile_number',
		label: 'Calculated Mobile Number in International Format',
	},
	{
		id: 'hs_calculated_phone_number',
		label: 'Calculated Phone Number in International Format',
	},
	{
		id: 'hs_calculated_phone_number_area_code',
		label: 'Calculated Phone Number Area Code',
	},
	{
		id: 'hs_calculated_phone_number_country_code',
		label: 'Calculated Phone Number Country Code',
	},
	{
		id: 'hs_calculated_phone_number_region_code',
		label: 'Calculated Phone Number Region',
	},
	{
		id: 'hs_content_membership_email_confirmed',
		label: 'Email Confirmed',
	},
	{
		id: 'hs_content_membership_notes',
		label: 'Membership Notes',
	},
	{
		id: 'hs_content_membership_registered_at',
		label: 'Registered At',
	},
	{
		id: 'hs_content_membership_registration_domain_sent_to',
		label: 'Domain to which registration email was sent',
	},
	{
		id: 'hs_content_membership_registration_email_sent_at',
		label: 'Time registration email was sent',
	},
	{
		id: 'hs_content_membership_status',
		label: 'Status',
	},
	{
		id: 'hs_conversations_visitor_email',
		label: 'Conversations visitor email',
	},
	{
		id: 'hs_count_is_unworked',
		label: 'Count of unengaged contacts',
	},
	{
		id: 'hs_count_is_worked',
		label: 'Count of engaged contacts',
	},
	{
		id: 'hs_created_by_conversations',
		label: 'Created By Conversations',
	},
	{
		id: 'hs_created_by_user_id',
		label: 'Created by user ID',
	},
	{
		id: 'hs_createdate',
		label: 'Object create date/time',
	},
	{
		id: 'hs_document_last_revisited',
		label: 'Recent Document Revisit Date',
	},
	{
		id: 'hs_email_bad_address',
		label: 'Invalid email address',
	},
	{
		id: 'hs_email_customer_quarantined_reason',
		label: 'Email address quarantine reason',
	},
	{
		id: 'hs_email_domain',
		label: 'Email Domain',
	},
	{
		id: 'hs_email_hard_bounce_reason',
		label: 'Email hard bounce reason',
	},
	{
		id: 'hs_email_hard_bounce_reason_enum',
		label: 'Email hard bounce reason',
	},
	{
		id: 'hs_email_quarantined',
		label: 'Email Address Quarantined',
	},
	{
		id: 'hs_email_quarantined_reason',
		label: 'Email address internal quarantine reason',
	},
	{
		id: 'hs_email_recipient_fatigue_recovery_time',
		label: 'Email Address Recipient Fatigue Next Available Sending Time',
	},
	{
		id: 'hs_email_sends_since_last_engagement',
		label: 'Sends Since Last Engagement',
	},
	{
		id: 'hs_emailconfirmationstatus',
		label: 'Marketing email confirmation status',
	},
	{
		id: 'hs_facebook_ad_clicked',
		label: 'Clicked Facebook ad',
	},
	{
		id: 'hs_facebook_click_id',
		label: 'Facebook click id',
	},
	{
		id: 'hs_facebookid',
		label: 'Facebook ID',
	},
	{
		id: 'hs_feedback_last_nps_follow_up',
		label: 'Last NPS survey comment',
	},
	{
		id: 'hs_feedback_last_nps_rating',
		label: 'Last NPS survey rating',
	},
	{
		id: 'hs_feedback_last_survey_date',
		label: 'Last NPS survey date',
	},
	{
		id: 'hs_feedback_show_nps_web_survey',
		label: 'Should be shown an NPS web survey',
	},
	{
		id: 'hs_first_engagement_object_id',
		label: 'ID of first engagement',
	},
	{
		id: 'hs_google_click_id',
		label: 'Google ad click id',
	},
	{
		id: 'hs_googleplusid',
		label: 'googleplus ID',
	},
	{
		id: 'hs_ip_timezone',
		label: 'IP Timezone',
	},
	{
		id: 'hs_is_contact',
		label: 'Is a contact',
	},
	{
		id: 'hs_is_unworked',
		label: 'Contact unworked',
	},
	{
		id: 'hs_last_sales_activity_date',
		label: 'last sales activity date old',
	},
	{
		id: 'hs_last_sales_activity_timestamp',
		label: 'Last Engagement Date',
	},
	{
		id: 'hs_lastmodifieddate',
		label: 'Object last modified date/time',
	},
	{
		id: 'hs_lead_status',
		label: 'Lead Status',
	},
	{
		id: 'hs_legal_basis',
		label: "Legal basis for processing contact's data",
	},
	{
		id: 'hs_linkedinid',
		label: 'Linkedin ID',
	},
	{
		id: 'hs_marketable_reason_id',
		label: 'Marketing contact status source name',
	},
	{
		id: 'hs_marketable_reason_type',
		label: 'Marketing contact status source type',
	},
	{
		id: 'hs_marketable_status',
		label: 'Marketing contact status',
	},
	{
		id: 'hs_marketable_until_renewal',
		label: 'Marketing contact until next update',
	},
	{
		id: 'hs_merged_object_ids',
		label: 'Merged object IDs',
	},
	{
		id: 'hs_object_id',
		label: 'Contact ID',
	},
	{
		id: 'hs_predictivecontactscore_v2',
		label: 'Likelihood to close',
	},
	{
		id: 'hs_predictivescoringtier',
		label: 'Contact priority',
	},
	{
		id: 'hs_sa_first_engagement_date',
		label: 'Date of first engagement',
	},
	{
		id: 'hs_sa_first_engagement_descr',
		label: 'Description of first engagement',
	},
	{
		id: 'hs_sa_first_engagement_object_type',
		label: 'Type of first engagement',
	},
	{
		id: 'hs_sales_email_last_clicked',
		label: 'Recent Sales Email Clicked Date',
	},
	{
		id: 'hs_sales_email_last_opened',
		label: 'Recent Sales Email Opened Date',
	},
	{
		id: 'hs_searchable_calculated_international_mobile_number',
		label: 'Calculated Mobile Number with country code',
	},
	{
		id: 'hs_searchable_calculated_international_phone_number',
		label: 'Calculated Phone Number with country code',
	},
	{
		id: 'hs_searchable_calculated_mobile_number',
		label: 'Calculated Mobile Number without country code',
	},
	{
		id: 'hs_searchable_calculated_phone_number',
		label: 'Calculated Phone Number without country code',
	},
	{
		id: 'hs_sequences_is_enrolled',
		label: 'Currently in Sequence',
	},
	{
		id: 'hs_testpurge',
		label: 'testpurge',
	},
	{
		id: 'hs_testrollback',
		label: 'testrollback',
	},
	{
		id: 'hs_time_between_contact_creation_and_deal_close',
		label: 'Time between contact creation and deal close',
	},
	{
		id: 'hs_time_between_contact_creation_and_deal_creation',
		label: 'Time between contact creation and deal creation',
	},
	{
		id: 'hs_time_to_first_engagement',
		label: 'Lead response time',
	},
	{
		id: 'hs_time_to_move_from_lead_to_customer',
		label: 'Time to move from lead to customer',
	},
	{
		id: 'hs_time_to_move_from_marketingqualifiedlead_to_customer',
		label: 'Time to move from marketing qualified lead to customer',
	},
	{
		id: 'hs_time_to_move_from_opportunity_to_customer',
		label: 'Time to move from opportunity to customer',
	},
	{
		id: 'hs_time_to_move_from_salesqualifiedlead_to_customer',
		label: 'Time to move from sales qualified lead to customer',
	},
	{
		id: 'hs_time_to_move_from_subscriber_to_customer',
		label: 'Time to move from subscriber to customer',
	},
	{
		id: 'hs_twitterid',
		label: 'Twitter ID',
	},
	{
		id: 'hs_updated_by_user_id',
		label: 'Updated by user ID',
	},
	{
		id: 'hs_user_ids_of_all_owners',
		label: 'User IDs of all owners',
	},
	{
		id: 'hubspot_owner_assigneddate',
		label: 'Owner Assigned Date',
	},
	{
		id: 'ip_city',
		label: 'IP City',
	},
	{
		id: 'ip_country',
		label: 'IP Country',
	},
	{
		id: 'ip_country_code',
		label: 'IP Country Code',
	},
	{
		id: 'ip_latlon',
		label: 'IP Latitude & Longitude',
	},
	{
		id: 'ip_state',
		label: 'IP State/Region',
	},
	{
		id: 'ip_state_code',
		label: 'IP State Code/Region Code',
	},
	{
		id: 'ip_zipcode',
		label: 'IP Zipcode',
	},
	{
		id: 'job_function',
		label: 'Job function',
	},
	{
		id: 'lastmodifieddate',
		label: 'Last Modified Date',
	},
	{
		id: 'marital_status',
		label: 'Marital Status',
	},
	{
		id: 'military_status',
		label: 'Military status',
	},
	{
		id: 'num_associated_deals',
		label: 'Associated Deals',
	},
	{
		id: 'num_conversion_events',
		label: 'Number of Form Submissions',
	},
	{
		id: 'num_unique_conversion_events',
		label: 'Number of Unique Forms Submitted',
	},
	{
		id: 'recent_conversion_date',
		label: 'Recent Conversion Date',
	},
	{
		id: 'recent_conversion_event_name',
		label: 'Recent Conversion',
	},
	{
		id: 'recent_deal_amount',
		label: 'Recent Deal Amount',
	},
	{
		id: 'recent_deal_close_date',
		label: 'Recent Deal Close Date',
	},
	{
		id: 'relationship_status',
		label: 'Relationship Status',
	},
	{
		id: 'school',
		label: 'School',
	},
	{
		id: 'seniority',
		label: 'Seniority',
	},
	{
		id: 'start_date',
		label: 'Start date',
	},
	{
		id: 'testing',
		label: 'testing',
	},
	{
		id: 'total_revenue',
		label: 'Total Revenue',
	},
	{
		id: 'work_email',
		label: 'Work email',
	},
	{
		id: 'firstname',
		label: 'First Name',
	},
	{
		id: 'hs_analytics_first_url',
		label: 'First Page Seen',
	},
	{
		id: 'hs_email_delivered',
		label: 'Marketing emails delivered',
	},
	{
		id: 'hs_email_optout_6871816',
		label: 'Opted out of email: Marketing Information',
	},
	{
		id: 'hs_email_optout_8363428',
		label: 'Opted out of email: One to One',
	},
	{
		id: 'twitterhandle',
		label: 'Twitter Username',
	},
	{
		id: 'currentlyinworkflow',
		label: 'Currently in workflow',
	},
	{
		id: 'followercount',
		label: 'Follower Count',
	},
	{
		id: 'hs_analytics_last_url',
		label: 'Last Page Seen',
	},
	{
		id: 'hs_email_open',
		label: 'Marketing emails opened',
	},
	{
		id: 'lastname',
		label: 'Last Name',
	},
	{
		id: 'hs_analytics_num_page_views',
		label: 'Number of Pageviews',
	},
	{
		id: 'hs_email_click',
		label: 'Marketing emails clicked',
	},
	{
		id: 'salutation',
		label: 'Salutation',
	},
	{
		id: 'twitterprofilephoto',
		label: 'Twitter Profile Photo',
	},
	{
		id: 'email',
		label: 'Email',
	},
	{
		id: 'hs_analytics_num_visits',
		label: 'Number of Sessions',
	},
	{
		id: 'hs_email_bounce',
		label: 'Marketing emails bounced',
	},
	{
		id: 'hs_persona',
		label: 'Persona',
	},
	{
		id: 'hs_social_last_engagement',
		label: 'Most Recent Social Click',
	},
	{
		id: 'hs_analytics_num_event_completions',
		label: 'Number of event completions',
	},
	{
		id: 'hs_email_optout',
		label: 'Unsubscribed from all email',
	},
	{
		id: 'hs_social_twitter_clicks',
		label: 'Twitter Clicks',
	},
	{
		id: 'mobilephone',
		label: 'Mobile Phone Number',
	},
	{
		id: 'phone',
		label: 'Phone Number',
	},
	{
		id: 'fax',
		label: 'Fax Number',
	},
	{
		id: 'hs_analytics_first_timestamp',
		label: 'Time First Seen',
	},
	{
		id: 'hs_email_last_email_name',
		label: 'Last marketing email name',
	},
	{
		id: 'hs_email_last_send_date',
		label: 'Last marketing email send date',
	},
	{
		id: 'hs_social_facebook_clicks',
		label: 'Facebook Clicks',
	},
	{
		id: 'address',
		label: 'Street Address',
	},
	{
		id: 'engagements_last_meeting_booked',
		label: 'Date of last meeting booked in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_campaign',
		label: 'Campaign of last booking in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_medium',
		label: 'Medium of last booking in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_source',
		label: 'Source of last booking in meetings tool',
	},
	{
		id: 'hs_analytics_first_visit_timestamp',
		label: 'Time of First Session',
	},
	{
		id: 'hs_email_last_open_date',
		label: 'Last marketing email open date',
	},
	{
		id: 'hs_latest_meeting_activity',
		label: 'Latest meeting activity',
	},
	{
		id: 'hs_sales_email_last_replied',
		label: 'Recent Sales Email Replied Date',
	},
	{
		id: 'hs_social_linkedin_clicks',
		label: 'LinkedIn Clicks',
	},
	{
		id: 'hubspot_owner_id',
		label: 'Contact owner',
	},
	{
		id: 'notes_last_contacted',
		label: 'Last Contacted',
	},
	{
		id: 'notes_last_updated',
		label: 'Last Activity Date',
	},
	{
		id: 'notes_next_activity_date',
		label: 'Next Activity Date',
	},
	{
		id: 'num_contacted_notes',
		label: 'Number of times contacted',
	},
	{
		id: 'num_notes',
		label: 'Number of Sales Activities',
	},
	{
		id: 'owneremail',
		label: 'HubSpot Owner Email (legacy)',
	},
	{
		id: 'ownername',
		label: 'HubSpot Owner Name (legacy)',
	},
	{
		id: 'surveymonkeyeventlastupdated',
		label: 'SurveyMonkey Event Last Updated',
	},
	{
		id: 'webinareventlastupdated',
		label: 'Webinar Event Last Updated',
	},
	{
		id: 'city',
		label: 'City',
	},
	{
		id: 'hs_analytics_last_timestamp',
		label: 'Time Last Seen',
	},
	{
		id: 'hs_email_last_click_date',
		label: 'Last marketing email click date',
	},
	{
		id: 'hs_social_google_plus_clicks',
		label: 'Google Plus Clicks',
	},
	{
		id: 'hubspot_team_id',
		label: 'HubSpot Team',
	},
	{
		id: 'linkedinbio',
		label: 'LinkedIn Bio',
	},
	{
		id: 'twitterbio',
		label: 'Twitter Bio',
	},
	{
		id: 'hs_all_owner_ids',
		label: 'All owner ids',
	},
	{
		id: 'hs_analytics_last_visit_timestamp',
		label: 'Time of Last Session',
	},
	{
		id: 'hs_email_first_send_date',
		label: 'First marketing email send date',
	},
	{
		id: 'hs_social_num_broadcast_clicks',
		label: 'Broadcast Clicks',
	},
	{
		id: 'state',
		label: 'State/Region',
	},
	{
		id: 'hs_all_team_ids',
		label: 'All team ids',
	},
	{
		id: 'hs_analytics_source',
		label: 'Original Source',
	},
	{
		id: 'hs_email_first_open_date',
		label: 'First marketing email open date',
	},
	{
		id: 'zip',
		label: 'Postal Code',
	},
	{
		id: 'country',
		label: 'Country/Region',
	},
	{
		id: 'hs_all_accessible_team_ids',
		label: 'All accessible team ids',
	},
	{
		id: 'hs_analytics_source_data_1',
		label: 'Original Source Drill-Down 1',
	},
	{
		id: 'hs_email_first_click_date',
		label: 'First marketing email click date',
	},
	{
		id: 'linkedinconnections',
		label: 'LinkedIn Connections',
	},
	{
		id: 'hs_analytics_source_data_2',
		label: 'Original Source Drill-Down 2',
	},
	{
		id: 'hs_email_is_ineligible',
		label: 'Is globally ineligible',
	},
	{
		id: 'hs_language',
		label: 'Preferred language',
	},
	{
		id: 'kloutscoregeneral',
		label: 'Klout Score',
	},
	{
		id: 'hs_analytics_first_referrer',
		label: 'First Referring Site',
	},
	{
		id: 'hs_email_first_reply_date',
		label: 'First marketing email reply date',
	},
	{
		id: 'jobtitle',
		label: 'Job Title',
	},
	{
		id: 'photo',
		label: 'Photo',
	},
	{
		id: 'hs_analytics_last_referrer',
		label: 'Last Referring Site',
	},
	{
		id: 'hs_email_last_reply_date',
		label: 'Last marketing email reply date',
	},
	{
		id: 'message',
		label: 'Message',
	},
	{
		id: 'closedate',
		label: 'Close Date',
	},
	{
		id: 'hs_analytics_average_page_views',
		label: 'Average Pageviews',
	},
	{
		id: 'hs_email_replied',
		label: 'Marketing emails replied',
	},
	{
		id: 'hs_analytics_revenue',
		label: 'Event Revenue',
	},
	{
		id: 'hs_lifecyclestage_lead_date',
		label: 'Became a Lead Date',
	},
	{
		id: 'hs_lifecyclestage_marketingqualifiedlead_date',
		label: 'Became a Marketing Qualified Lead Date',
	},
	{
		id: 'hs_lifecyclestage_opportunity_date',
		label: 'Became an Opportunity Date',
	},
	{
		id: 'lifecyclestage',
		label: 'Lifecycle Stage',
	},
	{
		id: 'hs_lifecyclestage_salesqualifiedlead_date',
		label: 'Became a Sales Qualified Lead Date',
	},
	{
		id: 'createdate',
		label: 'Create Date',
	},
	{
		id: 'hs_lifecyclestage_evangelist_date',
		label: 'Became an Evangelist Date',
	},
	{
		id: 'hs_lifecyclestage_customer_date',
		label: 'Became a Customer Date',
	},
	{
		id: 'hubspotscore',
		label: 'HubSpot Score',
	},
	{
		id: 'company',
		label: 'Company Name',
	},
	{
		id: 'hs_lifecyclestage_subscriber_date',
		label: 'Became a Subscriber Date',
	},
	{
		id: 'hs_lifecyclestage_other_date',
		label: 'Became an Other Lifecycle Date',
	},
	{
		id: 'website',
		label: 'Website URL',
	},
	{
		id: 'numemployees',
		label: 'Number of Employees',
	},
	{
		id: 'annualrevenue',
		label: 'Annual Revenue',
	},
	{
		id: 'industry',
		label: 'Industry',
	},
	{
		id: 'associatedcompanyid',
		label: 'Associated Company ID',
	},
	{
		id: 'associatedcompanylastupdated',
		label: 'Associated Company Last Updated',
	},
	{
		id: 'hs_predictivecontactscorebucket',
		label: 'Lead Rating',
	},
	{
		id: 'hs_predictivecontactscore',
		label: 'Predictive Lead Score',
	},
];

export const companyFields = [
	{
		id: 'about_us',
		label: 'About Us',
	},
	{
		id: 'closedate_timestamp_earliest_value_a2a17e6e',
		label: 'closedate_timestamp_earliest_value_a2a17e6e',
	},
	{
		id: 'facebookfans',
		label: 'Facebook Fans',
	},
	{
		id: 'first_contact_createdate_timestamp_earliest_value_78b50eea',
		label: 'first_contact_createdate_timestamp_earliest_value_78b50eea',
	},
	{
		id: 'first_conversion_date',
		label: 'First Conversion Date',
	},
	{
		id: 'first_conversion_date_timestamp_earliest_value_61f58f2c',
		label: 'first_conversion_date_timestamp_earliest_value_61f58f2c',
	},
	{
		id: 'first_conversion_event_name',
		label: 'First Conversion',
	},
	{
		id: 'first_conversion_event_name_timestamp_earliest_value_68ddae0a',
		label: 'first_conversion_event_name_timestamp_earliest_value_68ddae0a',
	},
	{
		id: 'first_deal_created_date',
		label: 'First Deal Created Date',
	},
	{
		id: 'founded_year',
		label: 'Year Founded',
	},
	{
		id: 'hs_additional_domains',
		label: 'Additional Domains',
	},
	{
		id: 'hs_analytics_first_timestamp',
		label: 'Time First Seen',
	},
	{
		id: 'hs_analytics_first_timestamp_timestamp_earliest_value_11e3a63a',
		label: 'hs_analytics_first_timestamp_timestamp_earliest_value_11e3a63a',
	},
	{
		id: 'hs_analytics_first_touch_converting_campaign',
		label: 'First Touch Converting Campaign',
	},
	{
		id: 'hs_analytics_first_touch_converting_campaign_timestamp_earliest_value_4757fe10',
		label: 'hs_analytics_first_touch_converting_campaign_timestamp_earliest_value_4757fe10',
	},
	{
		id: 'hs_analytics_first_visit_timestamp',
		label: 'Time of First Session',
	},
	{
		id: 'hs_analytics_first_visit_timestamp_timestamp_earliest_value_accc17ae',
		label: 'hs_analytics_first_visit_timestamp_timestamp_earliest_value_accc17ae',
	},
	{
		id: 'hs_analytics_last_timestamp',
		label: 'Time Last Seen',
	},
	{
		id: 'hs_analytics_last_timestamp_timestamp_latest_value_4e16365a',
		label: 'hs_analytics_last_timestamp_timestamp_latest_value_4e16365a',
	},
	{
		id: 'hs_analytics_last_touch_converting_campaign',
		label: 'Last Touch Converting Campaign',
	},
	{
		id: 'hs_analytics_last_touch_converting_campaign_timestamp_latest_value_81a64e30',
		label: 'hs_analytics_last_touch_converting_campaign_timestamp_latest_value_81a64e30',
	},
	{
		id: 'hs_analytics_last_visit_timestamp',
		label: 'Time of Last Session',
	},
	{
		id: 'hs_analytics_last_visit_timestamp_timestamp_latest_value_999a0fce',
		label: 'hs_analytics_last_visit_timestamp_timestamp_latest_value_999a0fce',
	},
	{
		id: 'hs_analytics_num_page_views',
		label: 'Number of Pageviews',
	},
	{
		id: 'hs_analytics_num_page_views_cardinality_sum_e46e85b0',
		label: 'hs_analytics_num_page_views_cardinality_sum_e46e85b0',
	},
	{
		id: 'hs_analytics_num_visits',
		label: 'Number of Sessions',
	},
	{
		id: 'hs_analytics_num_visits_cardinality_sum_53d952a6',
		label: 'hs_analytics_num_visits_cardinality_sum_53d952a6',
	},
	{
		id: 'hs_analytics_source',
		label: 'Original Source Type',
	},
	{
		id: 'hs_analytics_source_data_1',
		label: 'Original Source Data 1',
	},
	{
		id: 'hs_analytics_source_data_1_timestamp_earliest_value_9b2f1fa1',
		label: 'hs_analytics_source_data_1_timestamp_earliest_value_9b2f1fa1',
	},
	{
		id: 'hs_analytics_source_data_2',
		label: 'Original Source Data 2',
	},
	{
		id: 'hs_analytics_source_data_2_timestamp_earliest_value_9b2f9400',
		label: 'hs_analytics_source_data_2_timestamp_earliest_value_9b2f9400',
	},
	{
		id: 'hs_analytics_source_timestamp_earliest_value_25a3a52c',
		label: 'hs_analytics_source_timestamp_earliest_value_25a3a52c',
	},
	{
		id: 'hs_avatar_filemanager_key',
		label: 'Avatar FileManager key',
	},
	{
		id: 'hs_created_by_user_id',
		label: 'Created by user ID',
	},
	{
		id: 'hs_createdate',
		label: 'Object create date/time',
	},
	{
		id: 'hs_ideal_customer_profile',
		label: 'Ideal Customer Profile Tier',
	},
	{
		id: 'hs_is_target_account',
		label: 'Target Account',
	},
	{
		id: 'hs_last_booked_meeting_date',
		label: 'Last Booked Meeting Date',
	},
	{
		id: 'hs_last_logged_call_date',
		label: 'Last Logged Call Date',
	},
	{
		id: 'hs_last_open_task_date',
		label: 'Last Open Task Date',
	},
	{
		id: 'hs_last_sales_activity_date',
		label: 'last sales activity date old',
	},
	{
		id: 'hs_last_sales_activity_timestamp',
		label: 'Last Engagement Date',
	},
	{
		id: 'hs_lastmodifieddate',
		label: 'Last Modified Date',
	},
	{
		id: 'hs_merged_object_ids',
		label: 'Merged object IDs',
	},
	{
		id: 'hs_num_blockers',
		label: 'Number of blockers',
	},
	{
		id: 'hs_num_contacts_with_buying_roles',
		label: 'Number of contacts with a buying role',
	},
	{
		id: 'hs_num_decision_makers',
		label: 'Number of decision makers',
	},
	{
		id: 'hs_num_open_deals',
		label: 'Number of open deals',
	},
	{
		id: 'hs_object_id',
		label: 'Company ID',
	},
	{
		id: 'hs_predictivecontactscore_v2',
		label: 'Likelihood to close',
	},
	{
		id: 'hs_predictivecontactscore_v2_next_max_max_d4e58c1e',
		label: 'hs_predictivecontactscore_v2_next_max_max_d4e58c1e',
	},
	{
		id: 'hs_target_account',
		label: 'Target Account',
	},
	{
		id: 'hs_target_account_probability',
		label: 'Target Account Probability',
	},
	{
		id: 'hs_target_account_recommendation_snooze_time',
		label: 'Target Account Recommendation Snooze Time',
	},
	{
		id: 'hs_target_account_recommendation_state',
		label: 'Target Account Recommendation State',
	},
	{
		id: 'hs_total_deal_value',
		label: 'Total open deal value',
	},
	{
		id: 'hs_updated_by_user_id',
		label: 'Updated by user ID',
	},
	{
		id: 'hs_user_ids_of_all_owners',
		label: 'User IDs of all owners',
	},
	{
		id: 'hubspot_owner_assigneddate',
		label: 'Owner Assigned Date',
	},
	{
		id: 'is_public',
		label: 'Is Public',
	},
	{
		id: 'num_associated_contacts',
		label: 'Associated Contacts',
	},
	{
		id: 'num_associated_deals',
		label: 'Associated Deals',
	},
	{
		id: 'num_conversion_events',
		label: 'Number of Form Submissions',
	},
	{
		id: 'num_conversion_events_cardinality_sum_d095f14b',
		label: 'num_conversion_events_cardinality_sum_d095f14b',
	},
	{
		id: 'recent_conversion_date',
		label: 'Recent Conversion Date',
	},
	{
		id: 'recent_conversion_date_timestamp_latest_value_72856da1',
		label: 'recent_conversion_date_timestamp_latest_value_72856da1',
	},
	{
		id: 'recent_conversion_event_name',
		label: 'Recent Conversion',
	},
	{
		id: 'recent_conversion_event_name_timestamp_latest_value_66c820bf',
		label: 'recent_conversion_event_name_timestamp_latest_value_66c820bf',
	},
	{
		id: 'recent_deal_amount',
		label: 'Recent Deal Amount',
	},
	{
		id: 'recent_deal_close_date',
		label: 'Recent Deal Close Date',
	},
	{
		id: 'timezone',
		label: 'Time Zone',
	},
	{
		id: 'total_money_raised',
		label: 'Total Money Raised',
	},
	{
		id: 'total_revenue',
		label: 'Total Revenue',
	},
	{
		id: 'name',
		label: 'Name',
	},
	{
		id: 'owneremail',
		label: 'HubSpot Owner Email',
	},
	{
		id: 'twitterhandle',
		label: 'Twitter Handle',
	},
	{
		id: 'ownername',
		label: 'HubSpot Owner Name',
	},
	{
		id: 'phone',
		label: 'Phone Number',
	},
	{
		id: 'twitterbio',
		label: 'Twitter Bio',
	},
	{
		id: 'twitterfollowers',
		label: 'Twitter Followers',
	},
	{
		id: 'address',
		label: 'Street Address',
	},
	{
		id: 'address2',
		label: 'Street Address 2',
	},
	{
		id: 'facebook_company_page',
		label: 'Facebook Company Page',
	},
	{
		id: 'city',
		label: 'City',
	},
	{
		id: 'linkedin_company_page',
		label: 'LinkedIn Company Page',
	},
	{
		id: 'linkedinbio',
		label: 'LinkedIn Bio',
	},
	{
		id: 'state',
		label: 'State/Region',
	},
	{
		id: 'googleplus_page',
		label: 'Google Plus Page',
	},
	{
		id: 'engagements_last_meeting_booked',
		label: 'Date of last meeting booked in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_campaign',
		label: 'Campaign of last booking in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_medium',
		label: 'Medium of last booking in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_source',
		label: 'Source of last booking in meetings tool',
	},
	{
		id: 'hs_latest_meeting_activity',
		label: 'Latest meeting activity',
	},
	{
		id: 'hs_sales_email_last_replied',
		label: 'Recent Sales Email Replied Date',
	},
	{
		id: 'hubspot_owner_id',
		label: 'Company owner',
	},
	{
		id: 'notes_last_contacted',
		label: 'Last Contacted',
	},
	{
		id: 'notes_last_updated',
		label: 'Last Activity Date',
	},
	{
		id: 'notes_next_activity_date',
		label: 'Next Activity Date',
	},
	{
		id: 'num_contacted_notes',
		label: 'Number of times contacted',
	},
	{
		id: 'num_notes',
		label: 'Number of Sales Activities',
	},
	{
		id: 'zip',
		label: 'Postal Code',
	},
	{
		id: 'country',
		label: 'Country/Region',
	},
	{
		id: 'hubspot_team_id',
		label: 'HubSpot Team',
	},
	{
		id: 'hs_all_owner_ids',
		label: 'All owner ids',
	},
	{
		id: 'website',
		label: 'Website URL',
	},
	{
		id: 'domain',
		label: 'Company Domain Name',
	},
	{
		id: 'hs_all_team_ids',
		label: 'All team ids',
	},
	{
		id: 'hs_all_accessible_team_ids',
		label: 'All accessible team ids',
	},
	{
		id: 'numberofemployees',
		label: 'Number of Employees',
	},
	{
		id: 'industry',
		label: 'Industry',
	},
	{
		id: 'annualrevenue',
		label: 'Annual Revenue',
	},
	{
		id: 'lifecyclestage',
		label: 'Lifecycle Stage',
	},
	{
		id: 'hs_lead_status',
		label: 'Lead Status',
	},
	{
		id: 'hs_parent_company_id',
		label: 'Parent Company',
	},
	{
		id: 'type',
		label: 'Type',
	},
	{
		id: 'description',
		label: 'Description',
	},
	{
		id: 'hs_num_child_companies',
		label: 'Number of child companies',
	},
	{
		id: 'hubspotscore',
		label: 'HubSpot Score',
	},
	{
		id: 'createdate',
		label: 'Create Date',
	},
	{
		id: 'closedate',
		label: 'Close Date',
	},
	{
		id: 'first_contact_createdate',
		label: 'First Contact Create Date',
	},
	{
		id: 'days_to_close',
		label: 'Days to Close',
	},
	{
		id: 'web_technologies',
		label: 'Web Technologies',
	},
];

export const dealFields = [
	{
		id: 'amount_in_home_currency',
		label: 'Amount in company currency',
	},
	{
		id: 'days_to_close',
		label: 'Days to close',
	},
	{
		id: 'deal_currency_code',
		label: 'Currency',
	},
	{
		id: 'hs_acv',
		label: 'Annual contract value',
	},
	{
		id: 'hs_analytics_source',
		label: 'Original Source Type',
	},
	{
		id: 'hs_analytics_source_data_1',
		label: 'Original Source Data 1',
	},
	{
		id: 'hs_analytics_source_data_2',
		label: 'Original Source Data 2',
	},
	{
		id: 'hs_arr',
		label: 'Annual recurring revenue',
	},
	{
		id: 'hs_campaign',
		label: 'HubSpot Campaign',
	},
	{
		id: 'hs_closed_amount',
		label: 'Closed Deal Amount',
	},
	{
		id: 'hs_closed_amount_in_home_currency',
		label: 'Closed Deal Amount In Home Currency',
	},
	{
		id: 'hs_created_by_user_id',
		label: 'Created by user ID',
	},
	{
		id: 'hs_date_entered_appointmentscheduled',
		label: "Date entered 'Appointment Scheduled (Sales Pipeline)'",
	},
	{
		id: 'hs_date_entered_closedlost',
		label: "Date entered 'Closed Lost (Sales Pipeline)'",
	},
	{
		id: 'hs_date_entered_closedwon',
		label: "Date entered 'Closed Won (Sales Pipeline)'",
	},
	{
		id: 'hs_date_entered_contractsent',
		label: "Date entered 'Contract Sent (Sales Pipeline)'",
	},
	{
		id: 'hs_date_entered_decisionmakerboughtin',
		label: "Date entered 'Decision Maker Bought-In (Sales Pipeline)'",
	},
	{
		id: 'hs_date_entered_presentationscheduled',
		label: "Date entered 'Presentation Scheduled (Sales Pipeline)'",
	},
	{
		id: 'hs_date_entered_qualifiedtobuy',
		label: "Date entered 'Qualified To Buy (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_appointmentscheduled',
		label: "Date exited 'Appointment Scheduled (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_closedlost',
		label: "Date exited 'Closed Lost (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_closedwon',
		label: "Date exited 'Closed Won (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_contractsent',
		label: "Date exited 'Contract Sent (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_decisionmakerboughtin',
		label: "Date exited 'Decision Maker Bought-In (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_presentationscheduled',
		label: "Date exited 'Presentation Scheduled (Sales Pipeline)'",
	},
	{
		id: 'hs_date_exited_qualifiedtobuy',
		label: "Date exited 'Qualified To Buy (Sales Pipeline)'",
	},
	{
		id: 'hs_deal_amount_calculation_preference',
		label: 'Deal amount calculation preference',
	},
	{
		id: 'hs_deal_stage_probability',
		label: 'Deal Stage Probability',
	},
	{
		id: 'hs_forecast_amount',
		label: 'Forecast Amount',
	},
	{
		id: 'hs_forecast_probability',
		label: 'Forecast Probability',
	},
	{
		id: 'hs_is_closed',
		label: 'Is Deal Closed?',
	},
	{
		id: 'hs_lastmodifieddate',
		label: 'Last Modified Date',
	},
	{
		id: 'hs_likelihood_to_close',
		label: 'Likelihood to close by the close date',
	},
	{
		id: 'hs_line_item_global_term_hs_discount_percentage',
		label: 'Global Term Line Item Discount Percentage',
	},
	{
		id: 'hs_line_item_global_term_hs_discount_percentage_enabled',
		label: 'Global Term Line Item Discount Percentage Enabled',
	},
	{
		id: 'hs_line_item_global_term_hs_recurring_billing_period',
		label: 'Global Term Line Item Recurring Billing Period',
	},
	{
		id: 'hs_line_item_global_term_hs_recurring_billing_period_enabled',
		label: 'Global Term Line Item Recurring Billing Period Enabled',
	},
	{
		id: 'hs_line_item_global_term_hs_recurring_billing_start_date',
		label: 'Global Term Line Item Recurring Billing Start Date',
	},
	{
		id: 'hs_line_item_global_term_hs_recurring_billing_start_date_enabled',
		label: 'Global Term Line Item Recurring Billing Start Date Enabled',
	},
	{
		id: 'hs_line_item_global_term_recurringbillingfrequency',
		label: 'Global Term Line Item Recurring Billing Frequency',
	},
	{
		id: 'hs_line_item_global_term_recurringbillingfrequency_enabled',
		label: 'Global Term Line Item Recurring Billing Frequency Enabled',
	},
	{
		id: 'hs_manual_forecast_category',
		label: 'Forecast category',
	},
	{
		id: 'hs_merged_object_ids',
		label: 'Merged object IDs',
	},
	{
		id: 'hs_mrr',
		label: 'Monthly recurring revenue',
	},
	{
		id: 'hs_next_step',
		label: 'Next step',
	},
	{
		id: 'hs_object_id',
		label: 'Deal ID',
	},
	{
		id: 'hs_predicted_amount',
		label: 'The predicted deal amount',
	},
	{
		id: 'hs_predicted_amount_in_home_currency',
		label: "The predicted deal amount in your company's currency",
	},
	{
		id: 'hs_projected_amount',
		label: 'Projected Deal Amount',
	},
	{
		id: 'hs_projected_amount_in_home_currency',
		label: 'Projected Deal Amount in Home Currency',
	},
	{
		id: 'hs_tcv',
		label: 'Total contract value',
	},
	{
		id: 'hs_time_in_appointmentscheduled',
		label: "Time in 'Appointment Scheduled (Sales Pipeline)'",
	},
	{
		id: 'hs_time_in_closedlost',
		label: "Time in 'Closed Lost (Sales Pipeline)'",
	},
	{
		id: 'hs_time_in_closedwon',
		label: "Time in 'Closed Won (Sales Pipeline)'",
	},
	{
		id: 'hs_time_in_contractsent',
		label: "Time in 'Contract Sent (Sales Pipeline)'",
	},
	{
		id: 'hs_time_in_decisionmakerboughtin',
		label: "Time in 'Decision Maker Bought-In (Sales Pipeline)'",
	},
	{
		id: 'hs_time_in_presentationscheduled',
		label: "Time in 'Presentation Scheduled (Sales Pipeline)'",
	},
	{
		id: 'hs_time_in_qualifiedtobuy',
		label: "Time in 'Qualified To Buy (Sales Pipeline)'",
	},
	{
		id: 'hs_updated_by_user_id',
		label: 'Updated by user ID',
	},
	{
		id: 'hs_user_ids_of_all_owners',
		label: 'User IDs of all owners',
	},
	{
		id: 'hubspot_owner_assigneddate',
		label: 'Owner Assigned Date',
	},
	{
		id: 'testing',
		label: 'testing',
	},
	{
		id: 'dealname',
		label: 'Deal Name',
	},
	{
		id: 'amount',
		label: 'Amount',
	},
	{
		id: 'dealstage',
		label: 'Deal Stage',
	},
	{
		id: 'pipeline',
		label: 'Pipeline',
	},
	{
		id: 'closedate',
		label: 'Close Date',
	},
	{
		id: 'createdate',
		label: 'Create Date',
	},
	{
		id: 'engagements_last_meeting_booked',
		label: 'Date of last meeting booked in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_campaign',
		label: 'Campaign of last booking in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_medium',
		label: 'Medium of last booking in meetings tool',
	},
	{
		id: 'engagements_last_meeting_booked_source',
		label: 'Source of last booking in meetings tool',
	},
	{
		id: 'hs_latest_meeting_activity',
		label: 'Latest meeting activity',
	},
	{
		id: 'hs_sales_email_last_replied',
		label: 'Recent Sales Email Replied Date',
	},
	{
		id: 'hubspot_owner_id',
		label: 'Deal owner',
	},
	{
		id: 'notes_last_contacted',
		label: 'Last Contacted',
	},
	{
		id: 'notes_last_updated',
		label: 'Last Activity Date',
	},
	{
		id: 'notes_next_activity_date',
		label: 'Next Activity Date',
	},
	{
		id: 'num_contacted_notes',
		label: 'Number of times contacted',
	},
	{
		id: 'num_notes',
		label: 'Number of Sales Activities',
	},
	{
		id: 'hs_createdate',
		label: 'HubSpot Create Date',
	},
	{
		id: 'hubspot_team_id',
		label: 'HubSpot Team',
	},
	{
		id: 'dealtype',
		label: 'Deal Type',
	},
	{
		id: 'hs_all_owner_ids',
		label: 'All owner ids',
	},
	{
		id: 'description',
		label: 'Deal Description',
	},
	{
		id: 'hs_all_team_ids',
		label: 'All team ids',
	},
	{
		id: 'hs_all_accessible_team_ids',
		label: 'All accessible team ids',
	},
	{
		id: 'num_associated_contacts',
		label: 'Number of Contacts',
	},
	{
		id: 'closed_lost_reason',
		label: 'Closed Lost Reason',
	},
	{
		id: 'closed_won_reason',
		label: 'Closed Won Reason',
	},
];

const reduceMetadatFields = (data: string[]) => {
	return data
		.reduce((a, v) => {
			//@ts-ignore
			a.push(...v.split(','));
			return a;
		}, [])
		.map((email) => ({ email }));
};

export const getEmailMetadata = (meta: IDataObject) => {
	return {
		from: {
			...(meta.fromEmail && { email: meta.fromEmail }),
			...(meta.firstName && { firstName: meta.firstName }),
			...(meta.lastName && { lastName: meta.lastName }),
		},
		cc: reduceMetadatFields((meta.cc as string[]) || []),
		bcc: reduceMetadatFields((meta.bcc as string[]) || []),
		...(meta.subject && { subject: meta.subject }),
		...(meta.html && { html: meta.html }),
		...(meta.text && { text: meta.text }),
	};
};

export const getTaskMetadata = (meta: IDataObject) => {
	return {
		...(meta.body && { body: meta.body }),
		...(meta.subject && { subject: meta.subject }),
		...(meta.status && { status: meta.status }),
		...(meta.forObjectType && { forObjectType: meta.forObjectType }),
	};
};

export const getMeetingMetadata = (meta: IDataObject) => {
	return {
		...(meta.body && { body: meta.body }),
		...(meta.startTime && { startTime: moment(meta.startTime as string).unix() }),
		...(meta.endTime && { endTime: moment(meta.endTime as string).unix() }),
		...(meta.title && { title: meta.title }),
		...(meta.internalMeetingNotes && { internalMeetingNotes: meta.internalMeetingNotes }),
	};
};

export const getCallMetadata = (meta: IDataObject) => {
	return {
		...(meta.toNumber && { toNumber: meta.toNumber }),
		...(meta.fromNumber && { fromNumber: meta.fromNumber }),
		...(meta.status && { status: meta.status }),
		...(meta.durationMilliseconds && { durationMilliseconds: meta.durationMilliseconds }),
		...(meta.recordingUrl && { recordingUrl: meta.recordingUrl }),
		...(meta.body && { body: meta.body }),
	};
};

export const getAssociations = (associations: {
	companyIds: string;
	dealIds: string;
	ownerIds: string;
	contactIds: string;
	ticketIds: string;
}) => {
	return {
		...(associations.companyIds && { companyIds: associations.companyIds.toString().split(',') }),
		...(associations.contactIds && { contactIds: associations.contactIds.toString().split(',') }),
		...(associations.dealIds && { dealIds: associations.dealIds.toString().split(',') }),
		...(associations.ownerIds && { ownerIds: associations.ownerIds.toString().split(',') }),
		...(associations.ticketIds && { ticketIds: associations.ticketIds.toString().split(',') }),
	};
};

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const { apiKey, appToken } = credentials as {
		appToken: string;
		apiKey: string;
	};

	const options: OptionsWithUri = {
		method: 'GET',
		headers: {},
		uri: 'https://api.hubapi.com/deals/v1/deal/paged',
		json: true,
	};

	if (apiKey) {
		options.qs = { hapikey: apiKey };
	} else {
		options.headers = { Authorization: `Bearer ${appToken}` };
	}

	return this.helpers.request(options);
}
