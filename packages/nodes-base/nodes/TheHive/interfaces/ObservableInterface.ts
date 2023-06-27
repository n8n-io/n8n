import type { TLP } from './AlertInterface';

export const enum ObservableStatus {
	OK = 'Ok',
	DELETED = 'Deleted',
}
export const enum ObservableDataType {
	'domain' = 'domain',
	'file' = 'file',
	'filename' = 'filename',
	'fqdn' = 'fqdn',
	'hash' = 'hash',
	'ip' = 'ip',
	'mail' = 'mail',
	'mail_subject' = 'mail_subject',
	'other' = 'other',
	'regexp' = 'regexp',
	'registry' = 'registry',
	'uri_path' = 'uri_path',
	'url' = 'url',
	'user-agent' = 'user-agent',
}

export interface IAttachment {
	name?: string;
	size?: number;
	id?: string;
	contentType?: string;
	hashes: string[];
}
export interface IObservable {
	// Required attributes
	id?: string;
	data?: string;
	attachment?: IAttachment;
	dataType?: ObservableDataType;
	message?: string;
	startDate?: Date;
	tlp?: TLP;
	ioc?: boolean;
	status?: ObservableStatus;
	// Optional attributes
	tags: string[];
	// Backend generated attributes

	createdBy?: string;
	createdAt?: Date;
	updatedBy?: string;
	upadtedAt?: Date;
}
