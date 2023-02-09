import type { Vendor } from './interfaces/vendor';
import type { VendorContact } from './interfaces/vendor-contact';

export type IVendorContact = Partial<Omit<VendorContact, 'id'>>;

export interface IVendor
	extends Partial<Omit<Vendor, 'id' | 'contacts' | 'user_id' | 'entity_type'>> {
	contacts?: IVendorContact[];
}
