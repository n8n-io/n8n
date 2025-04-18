export interface ICreateConversationBody {
	ticket_id?: string;
	body?: string;
	notify_emails?: string[];
	conversation_id?: string;
	private?: boolean;
	user_id?: number;
	from_email?: string;
	cc_email?: string[];
	bcc_email?: string[];
}
