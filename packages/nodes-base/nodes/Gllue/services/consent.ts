import {IDataObject} from 'n8n-workflow';
import {getOffSetDate} from '../helpers';
import {Hasura, N8nRequest} from '../GenericFunctions';
import {CONSENT_STATUS_CONSENTED} from '../constants';

class ConsentAPI extends Hasura {
	resource = 'consent';
}

export class ConsentedConsentAPIEndpoint extends ConsentAPI {
	action = 'is-consented';
}

export class SentConsentAPIEndpoint extends ConsentAPI {
	action = 'is-sent-30-days';
}

class CreateConsentAPIEndpoint extends ConsentAPI {
	action = 'add';
}

class UpdateConsentAPIEndpoint extends ConsentAPI {
	action = 'update';

}

export class ConsentService {
	createEndpoint: CreateConsentAPIEndpoint;
	getSentBeforeDateEndpoint: SentConsentAPIEndpoint;
	getConsentedByCandidateEndpoint: ConsentedConsentAPIEndpoint;
	updateWithIdEndpoint: UpdateConsentAPIEndpoint;


	constructor(request: N8nRequest) {
		this.createEndpoint = new CreateConsentAPIEndpoint(request);
		this.getSentBeforeDateEndpoint = new SentConsentAPIEndpoint(request);
		this.getConsentedByCandidateEndpoint = new ConsentedConsentAPIEndpoint(request);
		this.updateWithIdEndpoint = new UpdateConsentAPIEndpoint(request);
	}

	async create(candidateId: number, source: string, channel: string): Promise<IDataObject> {
		const data = {
			candidate_id: candidateId,
			source,
			channel,
		};
		const resp = await this.createEndpoint.post(data);
		return resp.insert_consents.returning[0];
	}

	async update(id: string, data: IDataObject) {
		const payload = {
			id,
			data,
		};
		return await this.updateWithIdEndpoint.post(payload);
	}

	async updateTrackId(id: string, trackId: string) {
		const payload = {
			message_track_id: trackId,
		};
		return await this.update(id, payload);
	}

	async getSentIn30Days(candidateId: number, source: string, channel: string) {
		const data = {
			candidate_id: candidateId,
			date_before_30_days: getOffSetDate(-30),
			source,
			channel,
		};
		return await this.getSentBeforeDateEndpoint.post(data);
	}

	async getConsented(candidateId: number, source: string, channel: string) {
		const data = {
			candidate_id: candidateId,
			source,
			channel,
		};
		return await this.getConsentedByCandidateEndpoint.post(data);
	}
}


export function shouldUpdateConsentStatus(currentStatus: string | undefined, newStatus: string): boolean {
	const newStatusIsNotNull = newStatus !== undefined && newStatus !== '';

	return newStatusIsNotNull && newStatus !== currentStatus && currentStatus !== CONSENT_STATUS_CONSENTED;
}
