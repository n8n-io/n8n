import { Vendor } from "./interfaces/vendor";
import { VendorContact } from "./interfaces/vendor-contact";

export interface IVendorContact extends Partial<Omit<VendorContact, 'id'>>  {
}

export interface IVendor extends Partial<Omit<Vendor, 'id' | 'contacts'>> {
	contacts?: IVendorContact[];	
}
