import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function hubspotApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	let authenticationMethod = this.getNodeParameter('authentication', 0);

	if (this.getNode().type.includes('Trigger')) {
		authenticationMethod = 'developerApi';
	}

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: uri || `https://api.hubapi.com${endpoint}`,
		body,
		json: true,
		useQuerystring: true,
	};

	try {
		if (authenticationMethod === 'apiKey') {
			const credentials = this.getCredentials('hubspotApi');

			options.qs.hapikey = credentials!.apiKey as string;

			return await this.helpers.request!(options);
		} else if (authenticationMethod === 'developerApi') {
			const credentials = this.getCredentials('hubspotDeveloperApi');

			options.qs.hapikey = credentials!.apiKey as string;

			return await this.helpers.request!(options);
		} else {
			// @ts-ignore
			return await this.helpers.requestOAuth2!.call(this, 'hubspotOAuth2Api', options, { tokenType: 'Bearer' });
		}
	} catch (error) {
		let errorMessages;

		if (error.response && error.response.body) {

			if (error.response.body.message) {

				errorMessages = [error.response.body.message];

			} else if (error.response.body.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.errors;

				if (errorMessages[0].message) {
					// @ts-ignore
					errorMessages = errorMessages.map(errorItem => errorItem.message);
				}
			}
			throw new Error(`Hubspot error response [${error.statusCode}]: ${errorMessages.join('|')}`);
		}

		throw error;
	}
}

/**
 * Make an API request to paginated hubspot endpoint
 * and return all results
 */
export async function hubspotApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = query.limit || 250;
	query.count = 100;
	body.limit = body.limit || 100;

	do {
		responseData = await hubspotApiRequest.call(this, method, endpoint, body, query);
		query.offset = responseData.offset;
		query.vidOffset = responseData['vid-offset'];
		returnData.push.apply(returnData, responseData[propertyName]);
		//ticket:getAll endpoint does not support setting a limit, so return once the limit is reached
		if (query.limit && query.limit <= returnData.length && endpoint.includes('/tickets/paged')) {
			return returnData;
		}
	} while (
		responseData['has-more'] !== undefined &&
		responseData['has-more'] !== null &&
		responseData['has-more'] !== false
	);
	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}

export const propertyEvents = [
	'contact.propertyChange',
	'company.propertyChange',
	'deal.propertyChange',
];

export const contactFields = [
	'company_size',
	'date',
	'date_of_birth',
	'degree',
	'field_of_study',
	'first_deal_created_date',
	'gender',
	'graduation_date',
	'hs_additional_emails',
	'hs_all_contact_vids',
	'hs_analytics_first_touch_converting_campaign',
	'hs_analytics_last_touch_converting_campaign',
	'hs_avatar_filemanager_key',
	'hs_buying_role',
	'hs_calculated_form_submissions',
	'hs_calculated_merged_vids',
	'hs_calculated_mobile_number',
	'hs_calculated_phone_number',
	'hs_calculated_phone_number_area_code',
	'hs_calculated_phone_number_country_code',
	'hs_calculated_phone_number_region_code',
	'hs_content_membership_email_confirmed',
	'hs_content_membership_notes',
	'hs_content_membership_registered_at',
	'hs_content_membership_registration_domain_sent_to',
	'hs_content_membership_registration_email_sent_at',
	'hs_content_membership_status',
	'hs_conversations_visitor_email',
	'hs_count_is_unworked',
	'hs_count_is_worked',
	'hs_created_by_conversations',
	'hs_created_by_user_id',
	'hs_createdate',
	'hs_document_last_revisited',
	'hs_email_bad_address',
	'hs_email_customer_quarantined_reason',
	'hs_email_domain',
	'hs_email_hard_bounce_reason',
	'hs_email_hard_bounce_reason_enum',
	'hs_email_quarantined',
	'hs_email_quarantined_reason',
	'hs_email_recipient_fatigue_recovery_time',
	'hs_email_sends_since_last_engagement',
	'hs_emailconfirmationstatus',
	'hs_facebook_ad_clicked',
	'hs_facebook_click_id',
	'hs_facebookid',
	'hs_feedback_last_nps_follow_up',
	'hs_feedback_last_nps_rating',
	'hs_feedback_last_survey_date',
	'hs_feedback_show_nps_web_survey',
	'hs_first_engagement_object_id',
	'hs_google_click_id',
	'hs_googleplusid',
	'hs_ip_timezone',
	'hs_is_contact',
	'hs_is_unworked',
	'hs_last_sales_activity_date',
	'hs_last_sales_activity_timestamp',
	'hs_lastmodifieddate',
	'hs_lead_status',
	'hs_legal_basis',
	'hs_linkedinid',
	'hs_marketable_reason_id',
	'hs_marketable_reason_type',
	'hs_marketable_status',
	'hs_marketable_until_renewal',
	'hs_merged_object_ids',
	'hs_object_id',
	'hs_predictivecontactscore_v2',
	'hs_predictivescoringtier',
	'hs_sa_first_engagement_date',
	'hs_sa_first_engagement_descr',
	'hs_sa_first_engagement_object_type',
	'hs_sales_email_last_clicked',
	'hs_sales_email_last_opened',
	'hs_searchable_calculated_international_mobile_number',
	'hs_searchable_calculated_international_phone_number',
	'hs_searchable_calculated_mobile_number',
	'hs_searchable_calculated_phone_number',
	'hs_sequences_is_enrolled',
	'hs_testpurge',
	'hs_testrollback',
	'hs_time_between_contact_creation_and_deal_close',
	'hs_time_between_contact_creation_and_deal_creation',
	'hs_time_to_first_engagement',
	'hs_time_to_move_from_lead_to_customer',
	'hs_time_to_move_from_marketingqualifiedlead_to_customer',
	'hs_time_to_move_from_opportunity_to_customer',
	'hs_time_to_move_from_salesqualifiedlead_to_customer',
	'hs_time_to_move_from_subscriber_to_customer',
	'hs_twitterid',
	'hs_updated_by_user_id',
	'hs_user_ids_of_all_owners',
	'hubspot_owner_assigneddate',
	'ip_city',
	'ip_country',
	'ip_country_code',
	'ip_latlon',
	'ip_state',
	'ip_state_code',
	'ip_zipcode',
	'job_function',
	'lastmodifieddate',
	'marital_status',
	'military_status',
	'num_associated_deals',
	'recent_deal_amount',
	'recent_deal_close_date',
	'relationship_status',
	'school',
	'seniority',
	'start_date',
	'testing',
	'total_revenue',
	'work_email',
	'firstname',
	'hs_analytics_first_url',
	'hs_email_delivered',
	'hs_email_optout_6871816',
	'hs_email_optout_8363428',
	'twitterhandle',
	'currentlyinworkflow',
	'followercount',
	'hs_analytics_last_url',
	'hs_email_open',
	'lastname',
	'hs_analytics_num_page_views',
	'hs_email_click',
	'salutation',
	'twitterprofilephoto',
	'email',
	'hs_analytics_num_visits',
	'hs_email_bounce',
	'hs_persona',
	'hs_social_last_engagement',
	'hs_analytics_num_event_completions',
	'hs_email_optout',
	'hs_social_twitter_clicks',
	'mobilephone',
	'phone',
	'fax',
	'hs_analytics_first_timestamp',
	'hs_email_last_email_name',
	'hs_email_last_send_date',
	'hs_social_facebook_clicks',
	'address',
	'engagements_last_meeting_booked',
	'engagements_last_meeting_booked_campaign',
	'engagements_last_meeting_booked_medium',
	'engagements_last_meeting_booked_source',
	'hs_analytics_first_visit_timestamp',
	'hs_email_last_open_date',
	'hs_latest_meeting_activity',
	'hs_sales_email_last_replied',
	'hs_social_linkedin_clicks',
	'hubspot_owner_id',
	'notes_last_contacted',
	'notes_last_updated',
	'notes_next_activity_date',
	'num_contacted_notes',
	'num_notes',
	'owneremail',
	'ownername',
	'surveymonkeyeventlastupdated',
	'webinareventlastupdated',
	'city',
	'hs_analytics_last_timestamp',
	'hs_email_last_click_date',
	'hs_social_google_plus_clicks',
	'hubspot_team_id',
	'linkedinbio',
	'twitterbio',
	'hs_all_owner_ids',
	'hs_analytics_last_visit_timestamp',
	'hs_email_first_send_date',
	'hs_social_num_broadcast_clicks',
	'state',
	'hs_all_team_ids',
	'hs_analytics_source',
	'hs_email_first_open_date',
	'zip',
	'country',
	'hs_all_accessible_team_ids',
	'hs_analytics_source_data_1',
	'hs_email_first_click_date',
	'linkedinconnections',
	'hs_analytics_source_data_2',
	'hs_email_is_ineligible',
	'hs_language',
	'kloutscoregeneral',
	'hs_analytics_first_referrer',
	'hs_email_first_reply_date',
	'jobtitle',
	'photo',
	'hs_analytics_last_referrer',
	'hs_email_last_reply_date',
	'message',
	'closedate',
	'hs_analytics_average_page_views',
	'hs_email_replied',
	'hs_analytics_revenue',
	'hs_lifecyclestage_lead_date',
	'hs_lifecyclestage_marketingqualifiedlead_date',
	'hs_lifecyclestage_opportunity_date',
	'lifecyclestage',
	'hs_lifecyclestage_salesqualifiedlead_date',
	'createdate',
	'hs_lifecyclestage_evangelist_date',
	'hs_lifecyclestage_customer_date',
	'hubspotscore',
	'company',
	'hs_lifecyclestage_subscriber_date',
	'hs_lifecyclestage_other_date',
	'website',
	'numemployees',
	'annualrevenue',
	'industry',
	'associatedcompanyid',
	'associatedcompanylastupdated',
	'hs_predictivecontactscorebucket',
	'hs_predictivecontactscore',
];

export const companyFields = [
	'about_us',
	'closedate_timestamp_earliest_value_a2a17e6e',
	'facebookfans',
	'first_contact_createdate_timestamp_earliest_value_78b50eea',
	'first_conversion_date',
	'first_conversion_date_timestamp_earliest_value_61f58f2c',
	'first_conversion_event_name',
	'first_conversion_event_name_timestamp_earliest_value_68ddae0a',
	'first_deal_created_date',
	'founded_year',
	'hs_additional_domains',
	'hs_analytics_first_timestamp',
	'hs_analytics_first_timestamp_timestamp_earliest_value_11e3a63a',
	'hs_analytics_first_touch_converting_campaign',
	'hs_analytics_first_touch_converting_campaign_timestamp_earliest_value_4757fe10',
	'hs_analytics_first_visit_timestamp',
	'hs_analytics_first_visit_timestamp_timestamp_earliest_value_accc17ae',
	'hs_analytics_last_timestamp',
	'hs_analytics_last_timestamp_timestamp_latest_value_4e16365a',
	'hs_analytics_last_touch_converting_campaign',
	'hs_analytics_last_touch_converting_campaign_timestamp_latest_value_81a64e30',
	'hs_analytics_last_visit_timestamp',
	'hs_analytics_last_visit_timestamp_timestamp_latest_value_999a0fce',
	'hs_analytics_num_page_views',
	'hs_analytics_num_page_views_cardinality_sum_e46e85b0',
	'hs_analytics_num_visits',
	'hs_analytics_num_visits_cardinality_sum_53d952a6',
	'hs_analytics_source',
	'hs_analytics_source_data_1',
	'hs_analytics_source_data_1_timestamp_earliest_value_9b2f1fa1',
	'hs_analytics_source_data_2',
	'hs_analytics_source_data_2_timestamp_earliest_value_9b2f9400',
	'hs_analytics_source_timestamp_earliest_value_25a3a52c',
	'hs_avatar_filemanager_key',
	'hs_created_by_user_id',
	'hs_createdate',
	'hs_ideal_customer_profile',
	'hs_is_target_account',
	'hs_last_booked_meeting_date',
	'hs_last_logged_call_date',
	'hs_last_open_task_date',
	'hs_last_sales_activity_date',
	'hs_last_sales_activity_timestamp',
	'hs_lastmodifieddate',
	'hs_merged_object_ids',
	'hs_num_blockers',
	'hs_num_contacts_with_buying_roles',
	'hs_num_decision_makers',
	'hs_num_open_deals',
	'hs_object_id',
	'hs_predictivecontactscore_v2',
	'hs_predictivecontactscore_v2_next_max_max_d4e58c1e',
	'hs_target_account',
	'hs_target_account_probability',
	'hs_target_account_recommendation_snooze_time',
	'hs_target_account_recommendation_state',
	'hs_total_deal_value',
	'hs_updated_by_user_id',
	'hs_user_ids_of_all_owners',
	'hubspot_owner_assigneddate',
	'is_public',
	'num_associated_contacts',
	'num_associated_deals',
	'num_conversion_events',
	'num_conversion_events_cardinality_sum_d095f14b',
	'recent_conversion_date',
	'recent_conversion_date_timestamp_latest_value_72856da1',
	'recent_conversion_event_name',
	'recent_conversion_event_name_timestamp_latest_value_66c820bf',
	'recent_deal_amount',
	'recent_deal_close_date',
	'timezone',
	'total_money_raised',
	'total_revenue',
	'name',
	'owneremail',
	'twitterhandle',
	'ownername',
	'phone',
	'twitterbio',
	'twitterfollowers',
	'address',
	'address2',
	'facebook_company_page',
	'city',
	'linkedin_company_page',
	'linkedinbio',
	'state',
	'googleplus_page',
	'engagements_last_meeting_booked',
	'engagements_last_meeting_booked_campaign',
	'engagements_last_meeting_booked_medium',
	'engagements_last_meeting_booked_source',
	'hs_latest_meeting_activity',
	'hs_sales_email_last_replied',
	'hubspot_owner_id',
	'notes_last_contacted',
	'notes_last_updated',
	'notes_next_activity_date',
	'num_contacted_notes',
	'num_notes',
	'zip',
	'country',
	'hubspot_team_id',
	'hs_all_owner_ids',
	'website',
	'domain',
	'hs_all_team_ids',
	'hs_all_accessible_team_ids',
	'numberofemployees',
	'industry',
	'annualrevenue',
	'lifecyclestage',
	'hs_lead_status',
	'hs_parent_company_id',
	'type',
	'description',
	'hs_num_child_companies',
	'hubspotscore',
	'createdate',
	'closedate',
	'first_contact_createdate',
	'days_to_close',
	'web_technologies',
];

export const dealFields = [
	'amount_in_home_currency',
	'days_to_close',
	'deal_currency_code',
	'hs_acv',
	'hs_analytics_source',
	'hs_analytics_source_data_1',
	'hs_analytics_source_data_2',
	'hs_arr',
	'hs_campaign',
	'hs_closed_amount',
	'hs_closed_amount_in_home_currency',
	'hs_created_by_user_id',
	'hs_date_entered_appointmentscheduled',
	'hs_date_entered_closedlost',
	'hs_date_entered_closedwon',
	'hs_date_entered_contractsent',
	'hs_date_entered_decisionmakerboughtin',
	'hs_date_entered_presentationscheduled',
	'hs_date_entered_qualifiedtobuy',
	'hs_date_exited_appointmentscheduled',
	'hs_date_exited_closedlost',
	'hs_date_exited_closedwon',
	'hs_date_exited_contractsent',
	'hs_date_exited_decisionmakerboughtin',
	'hs_date_exited_presentationscheduled',
	'hs_date_exited_qualifiedtobuy',
	'hs_deal_amount_calculation_preference',
	'hs_deal_stage_probability',
	'hs_forecast_amount',
	'hs_forecast_probability',
	'hs_is_closed',
	'hs_lastmodifieddate',
	'hs_likelihood_to_close',
	'hs_line_item_global_term_hs_discount_percentage',
	'hs_line_item_global_term_hs_discount_percentage_enabled',
	'hs_line_item_global_term_hs_recurring_billing_period',
	'hs_line_item_global_term_hs_recurring_billing_period_enabled',
	'hs_line_item_global_term_hs_recurring_billing_start_date',
	'hs_line_item_global_term_hs_recurring_billing_start_date_enabled',
	'hs_line_item_global_term_recurringbillingfrequency',
	'hs_line_item_global_term_recurringbillingfrequency_enabled',
	'hs_manual_forecast_category',
	'hs_merged_object_ids',
	'hs_mrr',
	'hs_next_step',
	'hs_object_id',
	'hs_predicted_amount',
	'hs_predicted_amount_in_home_currency',
	'hs_projected_amount',
	'hs_projected_amount_in_home_currency',
	'hs_tcv',
	'hs_time_in_appointmentscheduled',
	'hs_time_in_closedlost',
	'hs_time_in_closedwon',
	'hs_time_in_contractsent',
	'hs_time_in_decisionmakerboughtin',
	'hs_time_in_presentationscheduled',
	'hs_time_in_qualifiedtobuy',
	'hs_updated_by_user_id',
	'hs_user_ids_of_all_owners',
	'hubspot_owner_assigneddate',
	'testing',
	'dealname',
	'amount',
	'dealstage',
	'pipeline',
	'closedate',
	'createdate',
	'engagements_last_meeting_booked',
	'engagements_last_meeting_booked_campaign',
	'engagements_last_meeting_booked_medium',
	'engagements_last_meeting_booked_source',
	'hs_latest_meeting_activity',
	'hs_sales_email_last_replied',
	'hubspot_owner_id',
	'notes_last_contacted',
	'notes_last_updated',
	'notes_next_activity_date',
	'num_contacted_notes',
	'num_notes',
	'hs_createdate',
	'hubspot_team_id',
	'dealtype',
	'hs_all_owner_ids',
	'description',
	'hs_all_team_ids',
	'hs_all_accessible_team_ids',
	'closed_lost_reason',
	'closed_won_reason',
];
