import type { Client } from './interfaces/client';
import type { ClientContact } from './interfaces/client-contact';

export type IClientContact = Partial<Omit<ClientContact, 'id'>>;

export interface IClient
	extends Partial<
		Omit<
			Client,
			| 'id'
			| 'balance'
			| 'credit_balance'
			| 'contacts'
			| 'display_name'
			| 'paid_to_date'
			| 'user_id'
			| 'entity_type'
		>
	> {
	contacts?: IClientContact[];
}
