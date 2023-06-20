export interface GllueEvent {
	date: string;
	info: string;
	sign: string;
}

export interface CandidateResponse {
	id: number;
	email: string;
}

export interface CvSentDetailResponse {
	id: number;
	gllueext_send_terms_cv_sent: string;
}

export interface InterviewDetailResponse {
	id: number;
}

export interface ClientResponse {
	id:number;
	warning_situation: string;
}

interface Contract {
	id:number;
	is_handsoff:boolean;
}

export interface Contracts {
	contracts: Contract[];
}

export interface ClientContractResponse{
	id:number;
	is_handsoff:boolean;
}

export interface PipelineResponse {
	ids: number[];
	result: {
		clientinterview?: InterviewDetailResponse[];
		cvsent?: CvSentDetailResponse[];
		candidate: CandidateResponse[];
		client: ClientResponse[];
		clientcontract?:ClientContractResponse[];
	};
}

interface Consent {
	id: string;
}

export interface Consents {
	consents: Consent[];
}

export interface GllueAPIIssueResponse {
	message: string;
	status: boolean;
}
