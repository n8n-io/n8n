export interface IAttachment {
	file_data?: string;
	file_name?: string;
}


export interface IEmail {
	address_field?: string;
	attachments?: IAttachment[];
	contacts: number[];
	html_content?: string;
	plain_content?: string;
	subject?: string;
	user_id: number;
}
