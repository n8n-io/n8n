import type { Client } from './interfaces/client';
import type { ClientContact } from './interfaces/client-contact';

export type IClientContact = Partial<Omit<ClientContact, 'id'>>;

export interface IClient extends Partial<Omit<Client, 'id' | 'contacts' | 'user_id' | 'display_name'>> {
	contacts?: IClientContact[];
}
