import { TestError } from '../Types';
import type { ApiHelpers } from './api-helper';

export class SourceControlApiHelper {
	constructor(private api: ApiHelpers) {}

	async disconnect({ keepKeyPair = true }: { keepKeyPair?: boolean } = {}) {
		const response = await this.api.request.post('/rest/source-control/disconnect', {
			data: {
				keepKeyPair,
			},
		});
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

	/**
	 * This will push all the changes
	 * OPTIMIZE: add a fileNames to select what specific changes to push
	 * @returns
	 */
	async pushWorkFolder({
		commitMessage,
		force = false,
	}: {
		commitMessage: string;
		force?: boolean;
	}) {
		const response = await this.api.request.post('/rest/source-control/push-workfolder', {
			data: {
				commitMessage,
				force,
				fileNames: [],
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to push work folder: ${await response.text()}`);
		}
		const result = await response.json();
		return result.data;
	}
}
