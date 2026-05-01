import type { IDataObject } from 'n8n-workflow';

export type SevenResource =
	| 'sms'
	| 'voice'
	| 'rcs'
	| 'whatsapp'
	| 'lookup'
	| 'account'
	| 'journal'
	| 'senderId'
	| 'number'
	| 'contact'
	| 'group'
	| 'subaccount';

export interface SevenSendSmsBody extends IDataObject {
	to: string;
	text: string;
	from?: string;
	delay?: string | number;
	flash?: boolean;
	udh?: string;
	ttl?: number;
	label?: string;
	performance_tracking?: boolean;
	foreign_id?: string;
	is_binary?: boolean;
	get_replies?: boolean;
	files?: IDataObject[];
}

export interface SevenSendVoiceBody extends IDataObject {
	to: string;
	text: string;
	from?: string;
	ringtime?: number;
	foreign_id?: string;
}

export interface SevenContactBody extends IDataObject {
	firstname?: string;
	lastname?: string;
	mobile_number?: string;
	home_number?: string;
	email?: string;
	address?: string;
	postal_code?: number;
	city?: string;
	birthday?: string;
	notes?: string;
	avatar?: string;
	groups?: number[];
}
