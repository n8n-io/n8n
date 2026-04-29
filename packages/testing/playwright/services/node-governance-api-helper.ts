import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export interface NodeGovernancePolicy {
	id: string;
	policyType: 'allow' | 'block';
	scope: 'global' | 'projects';
	targetType: 'node' | 'category';
	targetValue: string;
	createdById: string | null;
	projectAssignments?: Array<{
		id: string;
		projectId: string;
		project?: { id: string; name: string };
	}>;
	createdAt: string;
	updatedAt: string;
}

export interface NodeCategory {
	id: string;
	slug: string;
	displayName: string;
	description: string | null;
	color: string | null;
	createdById: string | null;
	nodeAssignments?: Array<{ id: string; nodeType: string }>;
	createdAt: string;
	updatedAt: string;
}

export interface NodeAccessRequest {
	id: string;
	projectId: string;
	requestedById: string;
	nodeType: string;
	justification: string;
	workflowName: string | null;
	status: 'pending' | 'approved' | 'rejected';
	reviewedById: string | null;
	reviewComment: string | null;
	reviewedAt: string | null;
	project?: { id: string; name: string };
	requestedBy?: { id: string; email: string; firstName?: string; lastName?: string };
	createdAt: string;
	updatedAt: string;
}

export interface CreatePolicyData {
	policyType: 'allow' | 'block';
	scope: 'global' | 'projects';
	targetType: 'node' | 'category';
	targetValue: string;
	projectIds?: string[];
}

export interface CreateCategoryData {
	slug?: string;
	displayName: string;
	description?: string;
	color?: string;
}

export interface CreateAccessRequestData {
	projectId: string;
	nodeType: string;
	justification: string;
	workflowName?: string;
}

export class NodeGovernanceApiHelper {
	constructor(private api: ApiHelpers) {}

	// ===== Policies =====

	/**
	 * Get all policies
	 * @returns Array of policies
	 */
	async getPolicies(): Promise<NodeGovernancePolicy[]> {
		const response = await this.api.request.get('/rest/node-governance/policies');

		if (!response.ok()) {
			throw new TestError(`Failed to get policies: ${await response.text()}`);
		}

		const result = await response.json();
		return result.policies ?? [];
	}

	/**
	 * Create a new policy
	 * @param data Policy data
	 * @returns The created policy
	 */
	async createPolicy(data: CreatePolicyData): Promise<NodeGovernancePolicy> {
		const response = await this.api.request.post('/rest/node-governance/policies', {
			data,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create policy: ${await response.text()}`);
		}

		const result = await response.json();
		return result.policy;
	}

	/**
	 * Create a global block policy for a node type
	 * @param nodeType The node type to block (e.g., 'n8n-nodes-base.httpRequest')
	 * @returns The created policy
	 */
	async createGlobalBlockPolicy(nodeType: string): Promise<NodeGovernancePolicy> {
		return await this.createPolicy({
			policyType: 'block',
			scope: 'global',
			targetType: 'node',
			targetValue: nodeType,
		});
	}

	/**
	 * Create a global allow policy for a node type
	 * @param nodeType The node type to allow
	 * @returns The created policy
	 */
	async createGlobalAllowPolicy(nodeType: string): Promise<NodeGovernancePolicy> {
		return await this.createPolicy({
			policyType: 'allow',
			scope: 'global',
			targetType: 'node',
			targetValue: nodeType,
		});
	}

	/**
	 * Create a project-scoped policy
	 * @param policyType 'allow' or 'block'
	 * @param targetType 'node' or 'category'
	 * @param targetValue The node type or category slug
	 * @param projectIds Array of project IDs
	 * @returns The created policy
	 */
	async createProjectPolicy(
		policyType: 'allow' | 'block',
		targetType: 'node' | 'category',
		targetValue: string,
		projectIds: string[],
	): Promise<NodeGovernancePolicy> {
		return await this.createPolicy({
			policyType,
			scope: 'projects',
			targetType,
			targetValue,
			projectIds,
		});
	}

	/**
	 * Update a policy
	 * @param id Policy ID
	 * @param data Partial policy data to update
	 * @returns The updated policy
	 */
	async updatePolicy(id: string, data: Partial<CreatePolicyData>): Promise<NodeGovernancePolicy> {
		const response = await this.api.request.patch(`/rest/node-governance/policies/${id}`, {
			data,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to update policy: ${await response.text()}`);
		}

		const result = await response.json();
		return result.policy;
	}

	/**
	 * Delete a policy
	 * @param id Policy ID
	 */
	async deletePolicy(id: string): Promise<void> {
		const response = await this.api.request.delete(`/rest/node-governance/policies/${id}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete policy: ${await response.text()}`);
		}
	}

	/**
	 * Delete all policies (cleanup helper)
	 */
	async deleteAllPolicies(): Promise<void> {
		const policies = await this.getPolicies();
		for (const policy of policies) {
			await this.deletePolicy(policy.id);
		}
	}

	// ===== Categories =====

	/**
	 * Get all categories
	 * @returns Array of categories
	 */
	async getCategories(): Promise<NodeCategory[]> {
		const response = await this.api.request.get('/rest/node-governance/categories');

		if (!response.ok()) {
			throw new TestError(`Failed to get categories: ${await response.text()}`);
		}

		const result = await response.json();
		return result.categories ?? [];
	}

	/**
	 * Create a new category
	 * @param data Category data (slug is auto-generated if not provided)
	 * @returns The created category
	 */
	async createCategory(data: CreateCategoryData): Promise<NodeCategory> {
		const slug = data.slug ?? `test-category-${nanoid(8).toLowerCase()}`;

		const response = await this.api.request.post('/rest/node-governance/categories', {
			data: {
				...data,
				slug,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create category: ${await response.text()}`);
		}

		const result = await response.json();
		return result.category;
	}

	/**
	 * Update a category
	 * @param id Category ID
	 * @param data Partial category data to update
	 * @returns The updated category
	 */
	async updateCategory(id: string, data: Partial<CreateCategoryData>): Promise<NodeCategory> {
		const response = await this.api.request.patch(`/rest/node-governance/categories/${id}`, {
			data,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to update category: ${await response.text()}`);
		}

		const result = await response.json();
		return result.category;
	}

	/**
	 * Delete a category
	 * @param id Category ID
	 */
	async deleteCategory(id: string): Promise<void> {
		const response = await this.api.request.delete(`/rest/node-governance/categories/${id}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete category: ${await response.text()}`);
		}
	}

	/**
	 * Delete all categories (cleanup helper)
	 */
	async deleteAllCategories(): Promise<void> {
		const categories = await this.getCategories();
		for (const category of categories) {
			await this.deleteCategory(category.id);
		}
	}

	/**
	 * Assign a node to a category
	 * @param categoryId Category ID
	 * @param nodeType Node type to assign
	 */
	async assignNodeToCategory(categoryId: string, nodeType: string): Promise<void> {
		const response = await this.api.request.post(
			`/rest/node-governance/categories/${categoryId}/nodes`,
			{
				data: { nodeType },
			},
		);

		if (!response.ok()) {
			throw new TestError(`Failed to assign node to category: ${await response.text()}`);
		}
	}

	/**
	 * Remove a node from a category
	 * @param categoryId Category ID
	 * @param nodeType Node type to remove
	 */
	async removeNodeFromCategory(categoryId: string, nodeType: string): Promise<void> {
		const encodedNodeType = encodeURIComponent(nodeType);
		const response = await this.api.request.delete(
			`/rest/node-governance/categories/${categoryId}/nodes/${encodedNodeType}`,
		);

		if (!response.ok()) {
			throw new TestError(`Failed to remove node from category: ${await response.text()}`);
		}
	}

	// ===== Access Requests =====

	/**
	 * Get all pending access requests
	 * @returns Array of pending requests
	 */
	async getPendingRequests(): Promise<NodeAccessRequest[]> {
		const response = await this.api.request.get('/rest/node-governance/requests');

		if (!response.ok()) {
			throw new TestError(`Failed to get pending requests: ${await response.text()}`);
		}

		const result = await response.json();
		return result.requests ?? [];
	}

	/**
	 * Create an access request
	 * @param data Request data
	 * @returns The created request
	 */
	async createAccessRequest(data: CreateAccessRequestData): Promise<NodeAccessRequest> {
		const response = await this.api.request.post('/rest/node-governance/requests', {
			data,
		});

		if (!response.ok()) {
			throw new TestError(`Failed to create access request: ${await response.text()}`);
		}

		const result = await response.json();
		return result.request;
	}

	/**
	 * Approve an access request
	 * @param id Request ID
	 * @param policyId Optional existing policy ID to use
	 * @returns The reviewed request
	 */
	async approveRequest(id: string, policyId?: string): Promise<NodeAccessRequest> {
		const response = await this.api.request.post(`/rest/node-governance/requests/${id}/review`, {
			data: {
				action: 'approve',
				...(policyId && { policyId }),
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to approve request: ${await response.text()}`);
		}

		const result = await response.json();
		return result.request;
	}

	/**
	 * Reject an access request
	 * @param id Request ID
	 * @param comment Optional rejection comment
	 * @returns The reviewed request
	 */
	async rejectRequest(id: string, comment?: string): Promise<NodeAccessRequest> {
		const response = await this.api.request.post(`/rest/node-governance/requests/${id}/review`, {
			data: {
				action: 'reject',
				...(comment && { comment }),
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to reject request: ${await response.text()}`);
		}

		const result = await response.json();
		return result.request;
	}

	// ===== Cleanup Helpers =====

	/**
	 * Clean up all node governance data (policies, categories)
	 * Useful for test cleanup
	 */
	async cleanupAll(): Promise<void> {
		await this.deleteAllPolicies();
		await this.deleteAllCategories();
	}
}
