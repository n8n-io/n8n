import {
	IDataObject,
 } from 'n8n-workflow';

export interface ICertficateRequest {
	isVaaSGenerated?: boolean;
	csrAttributes?: ICsrAttributes;
	applicationServerTypeId?: string;
	certificateSigningRequest?: string;
	applicationId?: string;
	certificateIssuingTemplateId?: string;
	certficateOwnerUserId?: string;
	validityPeriod?: string;
}

export interface ICsrAttributes {
	commonName?: string;
	organization?: string;
	organizationalUnits?: string[];
	locality?: string;
	state?: string;
	country?: string;
	keyTypeParameters?: IKeyTypeParameters;
	subjectAlternativeNamesByType?: ISubjectAltNamesByType;
}

export interface IKeyTypeParameters {
	keyType?: string;
	keyCurve?: string;
	keyLength?: Number;
}

export interface ISubjectAltNamesByType {
	dnsNames?: string[];
	rfc822Names?: string[];
	ipAddresses?: string[];
	uniformResourceIdentifiers?: string[];
}
