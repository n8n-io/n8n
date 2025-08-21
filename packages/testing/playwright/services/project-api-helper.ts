import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export class ProjectApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create a new project with a unique name
	 * @param projectName Optional base name for the project. If not provided, generates a default name.
	 * @returns The created project data
	 */
	async createProject(projectName?: string) {
		const uniqueName = projectName ? `${projectName} (${nanoid(8)})` : `Test Project ${nanoid(8)}`;

		const response = await this.api.request.post('/rest/projects', {
			data: {
				name: uniqueName,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create project: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}
}
