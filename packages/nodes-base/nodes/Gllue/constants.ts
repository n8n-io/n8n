export const DEFAULT_PAGINATE_BY = 25;
export const DEFAULT_PAGE = 1;

export const CV_SENT_EVENT = 'cvsent';
export const INTERVIEW_EVENT = 'clientinterview';
export const BLUE_HOST = 'https://cgpbrands.cgptalent.cn';
export const TOKEN_KEY = 'private_token';
export const BLUE_TOKEN_KEY = 'gllue_private_token';
export const BLUE_GLLUE_SOURCE = 'Brands Gllue';
export const EMAIL_CHANNEL = 'email';

export const VALID_GLLUE_SOURCES = [BLUE_GLLUE_SOURCE];

export const CONSENT_FROM_EMAIL = 'no-reply@cgpo2o.cn';
export const CONSENT_FROM_NAME = 'No Reply';
export const CONSENT_EMAIL_TYPE = 'CandidateConsentRequestEmail';
export const CONSENT_EMAIL_CATEGORY = 'candidate,consent,n8n,tracking';

export const DEV_NODE_ENV = 'dev';
export const STAGING_NODE_ENV = 'staging';

export interface HostMapping {
	[key: string]: string;
}
export const HOST_MAPPING:HostMapping = {
	dev: 'http://localhost:5678',
	staging: 'https://stage-crm-integration.cgpo2o.cn',
	production: 'https://crm-integration.cgpo2o.cn',
};

export const INTERVIEW_PIPELINE_NAME = 'clientinterview';


export const CONSENT_STATUS_CONSENTED = 'consented';
export const CONSENT_STATUS_SENT = 'sent';

