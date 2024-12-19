export interface ICertificateRequest {
	isVaaSGenerated?: boolean;
	csrAttributes?: ICsrAttributes;
	applicationServerTypeId?: string;
	certificateSigningRequest?: string;
	applicationId?: string;
	certificateIssuingTemplateId?: string;
	certificateOwnerUserId?: string;
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
	keyLength?: number;
}

export interface ISubjectAltNamesByType {
	dnsNames?: string[];
	rfc822Names?: string[];
	ipAddresses?: string[];
	uniformResourceIdentifiers?: string[];
}

export interface ICertificateKeystoreRequest {
	exportFormat?: string;
	encryptedPrivateKeyPassphrase?: string;
	encryptedKeystorePassphrase?: string;
	certificateLabel?: string;
}
