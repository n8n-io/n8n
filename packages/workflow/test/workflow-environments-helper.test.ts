import type { AutoPublishMode } from '../src/workflow-environments-helper';
import { shouldAutoPublishWorkflow } from '../src/workflow-environments-helper';

describe('shouldAutoPublishWorkflow', () => {
	describe('with autoPublish: "none"', () => {
		test.each([
			{
				name: 'new workflow',
				params: {
					isNewWorkflow: true,
					isLocalPublished: false,
					isRemoteArchived: false,
					autoPublish: 'none' as AutoPublishMode,
				},
				expected: false,
			},
			{
				name: 'existing published workflow',
				params: {
					isNewWorkflow: false,
					isLocalPublished: true,
					isRemoteArchived: false,
					autoPublish: 'none' as AutoPublishMode,
				},
				expected: false,
			},
			{
				name: 'existing unpublished workflow',
				params: {
					isNewWorkflow: false,
					isLocalPublished: false,
					isRemoteArchived: false,
					autoPublish: 'none' as AutoPublishMode,
				},
				expected: false,
			},
		])('should return false for $name', ({ params, expected }) => {
			expect(shouldAutoPublishWorkflow(params)).toBe(expected);
		});
	});

	describe('with autoPublish: "published"', () => {
		test.each([
			{
				name: 'new workflow',
				params: {
					isNewWorkflow: true,
					isLocalPublished: false,
					isRemoteArchived: false,
					autoPublish: 'published' as AutoPublishMode,
				},
				expected: false,
			},
			{
				name: 'existing published workflow',
				params: {
					isNewWorkflow: false,
					isLocalPublished: true,
					isRemoteArchived: false,
					autoPublish: 'published' as AutoPublishMode,
				},
				expected: true,
			},
			{
				name: 'existing unpublished workflow',
				params: {
					isNewWorkflow: false,
					isLocalPublished: false,
					isRemoteArchived: false,
					autoPublish: 'published' as AutoPublishMode,
				},
				expected: false,
			},
		])('should return $expected for $name', ({ params, expected }) => {
			expect(shouldAutoPublishWorkflow(params)).toBe(expected);
		});
	});

	describe('with autoPublish: "all"', () => {
		test.each([
			{
				name: 'new workflow',
				params: {
					isNewWorkflow: true,
					isLocalPublished: false,
					isRemoteArchived: false,
					autoPublish: 'all' as AutoPublishMode,
				},
				expected: true,
			},
			{
				name: 'existing published workflow',
				params: {
					isNewWorkflow: false,
					isLocalPublished: true,
					isRemoteArchived: false,
					autoPublish: 'all' as AutoPublishMode,
				},
				expected: true,
			},
			{
				name: 'existing unpublished workflow',
				params: {
					isNewWorkflow: false,
					isLocalPublished: false,
					isRemoteArchived: false,
					autoPublish: 'all' as AutoPublishMode,
				},
				expected: true,
			},
		])('should return $expected for $name', ({ params, expected }) => {
			expect(shouldAutoPublishWorkflow(params)).toBe(expected);
		});
	});

	describe('archived workflows', () => {
		test('should never activate archived workflows regardless of settings', () => {
			const autoPublishModes = [
				{ autoPublish: 'none' as AutoPublishMode },
				{ autoPublish: 'published' as AutoPublishMode },
				{ autoPublish: 'all' as AutoPublishMode },
			];

			const workflowStates = [
				{ isNewWorkflow: true, isLocalPublished: false },
				{ isNewWorkflow: false, isLocalPublished: true },
				{ isNewWorkflow: false, isLocalPublished: false },
			];

			autoPublishModes.forEach(({ autoPublish }) => {
				workflowStates.forEach(({ isNewWorkflow, isLocalPublished }) => {
					expect(
						shouldAutoPublishWorkflow({
							isNewWorkflow,
							isLocalPublished,
							isRemoteArchived: true,
							autoPublish,
						}),
					).toBe(false);
				});
			});
		});
	});
});
