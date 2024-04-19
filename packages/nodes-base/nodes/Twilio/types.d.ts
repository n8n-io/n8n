export interface MessagingService {
	date_updated: string;
	us_app_to_person_registered: boolean;
	sticky_sender: boolean;
	usecase: string;
	fallback_to_long_code: boolean;
	scan_message_content: string;
	fallback_url: string | null;
	use_inbound_webhook_on_number: boolean;
	sid: string;
	mms_converter: boolean;
	validity_period: number;
	fallback_method: string;
	synchronous_validation: boolean;
	inbound_method: string;
	area_code_geomatch: boolean;
	url: string;
	friendly_name: string;
	account_sid: string;
	inbound_request_url: string | null;
	smart_encoding: boolean;
	date_created: string;
	status_callback: string | null;
	links: {
		us_app_to_person_usecases: string;
		messages: string;
		us_app_to_person: string;
		alpha_senders: string;
		channel_senders: string;
		phone_numbers: string;
		short_codes: string;
	};
}

export interface MessagingServicesResponse {
	services: MessagingService[];
	meta: {
		page: number;
		page_size: number;
		first_page_url: string;
		previous_page_url: string | null;
		url: string;
		next_page_url: string | null;
		key: string;
	};
}
