import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

interface VariableResponse {
	id: string;
	key: string;
	value: string;
}

interface CreateVariableDto {
	key: string;
	value: string;
}

interface UpdateVariableDto {
	key?: string;
	value?: string;
}

export class VariablesApiHelper {
	constructor(private api: ApiHelpers) {}

	/**
	 * Create a new variable
	 */
	async createVariable(variable: CreateVariableDto): Promise<VariableResponse> {
		const response = await this.api.request.post('/rest/variables', { data: variable });

		if (!response.ok()) {
			throw new TestError(`Failed to create variable: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Get all variables
	 */
	async getAllVariables(): Promise<VariableResponse[]> {
		const response = await this.api.request.get('/rest/variables');

		if (!response.ok()) {
			throw new TestError(`Failed to get variables: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Get a variable by ID
	 */
	async getVariable(id: string): Promise<VariableResponse> {
		const response = await this.api.request.get(`/rest/variables/${id}`);

		if (!response.ok()) {
			throw new TestError(`Failed to get variable: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Update a variable by ID
	 */
	async updateVariable(id: string, updates: UpdateVariableDto): Promise<VariableResponse> {
		const response = await this.api.request.patch(`/rest/variables/${id}`, { data: updates });

		if (!response.ok()) {
			throw new TestError(`Failed to update variable: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/**
	 * Delete a variable by ID
	 */
	async deleteVariable(id: string): Promise<void> {
		const response = await this.api.request.delete(`/rest/variables/${id}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete variable: ${await response.text()}`);
		}
	}

	/**
	 * Delete all variables (useful for test cleanup)
	 */
	async deleteAllVariables(): Promise<void> {
		const variables = await this.getAllVariables();

		// Delete variables in parallel for better performance
		await Promise.all(variables.map((variable) => this.deleteVariable(variable.id)));
	}

	/**
	 * Create a test variable with a unique key
	 */
	async createTestVariable(
		keyPrefix: string = 'TEST_VAR',
		value: string = 'test_value',
	): Promise<VariableResponse> {
		const key = `${keyPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
		return await this.createVariable({ key, value });
	}

	/**
	 * Clean up variables by key pattern (useful for test cleanup)
	 */
	async cleanupTestVariables(keyPattern?: string): Promise<void> {
		const variables = await this.getAllVariables();

		const variablesToDelete = keyPattern
			? variables.filter((variable) => variable.key.includes(keyPattern))
			: variables.filter((variable) => variable.key.startsWith('TEST_'));

		await Promise.all(variablesToDelete.map((variable) => this.deleteVariable(variable.id)));
	}
}
