import { Client } from "./interfaces/client";
import { ClientContact } from "./interfaces/client-contact";

export interface IClientContact extends Partial<Omit<ClientContact, 'id'>>  {
}

export interface IClient extends Partial<Omit<Client, 'id' | 'contacts'>> {
	contacts?: IClientContact[];	
}
