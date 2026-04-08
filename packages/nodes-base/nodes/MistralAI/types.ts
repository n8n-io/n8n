import type { IDataObject } from 'n8n-workflow';

export interface BatchJob {
	id: string;
	status:
		| 'QUEUED'
		| 'RUNNING'
		| 'SUCCESS'
		| 'FAILED'
		| 'TIMEOUT_EXCEEDED'
		| 'CANCELLATION_REQUESTED'
		| 'CANCELLED';
	output_file: string;
	errors: IDataObject[];
}

export interface BatchItemResult {
	id: string;
	custom_id: string;
	response: {
		body: {
			pages: Page[];
		};
	};
	error?: IDataObject;
}

export interface Page {
	index: number;
	markdown: string;
	images: IDataObject[];
}
