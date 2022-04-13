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

export interface PipelineResponse {
	ids: number[];
	result: {
		clientinterview?: InterviewDetailResponse[];
		cvsent?: CvSentDetailResponse[];
		candidate: CandidateResponse[]
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
