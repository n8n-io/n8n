import type { Client } from './interfaces/client';
import type { ClientContact } from './interfaces/client-contact';

export type IClientContact = Partial<Omit<ClientContact, 'id'>>;

export interface IClient extends Partial<Omit<Client, 'id' | 'contacts'>> {
	contacts?: IClientContact[];
}
