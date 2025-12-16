import { TestError } from '../Types';
import type { ApiHelpers } from './api-helper';

export class SourceControlApiHelper {
	constructor(private api: ApiHelpers) {}

	async getPreferences() {
		const response = await this.api.request.get('/rest/source-control/preferences');
		if (!response.ok()) {
			throw new TestError(`Failed to get source control preferences: ${await response.text()}`);
		}
		const result = await response.json();
		return result.data;
	}

	async disconnect() {
		const response = await this.api.request.get('/rest/source-control/disconnect');
		if (!response.ok()) {
			throw new TestError(`Failed to disconnect from source control: ${await response.text()}`);
		}
		const result = await response.json();
		return result.data;
	}

	async connect(preferences: {
		repositoryUrl: string;
	}) {
		const response = await this.api.request.post('/rest/source-control/preferences', {
			data: {
				connectionType: 'ssh',
				...preferences,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to connect to source control: ${await response.text()}`);
		}
		const result = await response.json();
		return result.data;
	}
}
