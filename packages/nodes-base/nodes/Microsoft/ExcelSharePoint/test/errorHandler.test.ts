import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { delegatedApiError, servicePrincipalApiError } from '../helpers/errorHandler';

describe('Microsoft Excel (SharePoint) Error Handler', () => {
	let ctx: Mocked<IExecuteFunctions>;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.microsoftExcelSharePoint',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode);
		setParams({});
	});

	describe('servicePrincipalApiError', () => {
		it('reports a rejected token on a 401', () => {
			const error = servicePrincipalApiError.call(ctx, { httpCode: '401' });

			expect(error.message).toContain('Service Principal token was rejected');
		});

		it('falls back to a generic message when the permission is not in the lookup table', () => {
			setParams({ resource: 'worksheet', operation: 'unknownOperation' });

			const error = servicePrincipalApiError.call(ctx, { httpCode: '403' });

			expect(error.message).toBe(
				'The app registration is missing a consented application permission for this operation. Grant the required Microsoft Graph application permission and admin consent, then retry.',
			);
		});
	});

	describe('delegatedApiError', () => {
		it('falls back to a generic message when the permission is not in the lookup table', () => {
			setParams({ resource: 'worksheet', operation: 'unknownOperation' });

			const error = delegatedApiError.call(ctx, { statusCode: 403 });

			expect(error.message).toBe(
				'Microsoft Graph refused this request. The credential may be missing a required permission, or the signed-in account may not have access to this resource',
			);
		});

		it('replaces a nested ItemNotFound error with the not-found message', () => {
			// This is the shape a live tenant actually returns for a nonexistent
			// site/library/workbook/sheet, confirmed against a real Microsoft Graph tenant.
			const error = delegatedApiError.call(ctx, {
				statusCode: 404,
				error: {
					error: { code: 'ItemNotFound', message: "The requested resource doesn't exist." },
				},
			});

			expect(error.message).toBe(
				'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.',
			);
		});

		it('replaces the not-found message when the error arrives already wrapped in a NodeApiError', () => {
			// httpRequestWithAuthentication always wraps failures in `new NodeApiError(node, rawError)`
			// before this function ever sees them. That constructor lifts the parsed JSON body onto
			// `context.data`, not `error.error`, and overwrites `.message` with a generic per-status-code
			// default — both confirmed against a real Microsoft Graph tenant hitting a missing sheet.
			const rawHttpClientError = {
				response: {
					status: 404,
					data: {
						error: { code: 'ItemNotFound', message: "The requested resource doesn't exist." },
					},
				},
			};
			const wrapped = new NodeApiError(ctx.getNode(), rawHttpClientError as never);
			expect(wrapped.httpCode).toBe('404');
			expect(wrapped.message).toBe('The resource you are requesting could not be found');

			const error = delegatedApiError.call(ctx, wrapped);

			expect(error.message).toBe(
				'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.',
			);
		});

		it('replaces a nested NotFound error with the not-found message regardless of its message text', () => {
			const error = delegatedApiError.call(ctx, {
				statusCode: 404,
				error: { error: { code: 'NotFound', message: 'some other wording' } },
			});

			expect(error.message).toBe(
				'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.',
			);
		});

		it('passes through a nested error message for a non-NotFound code', () => {
			const error = delegatedApiError.call(ctx, {
				statusCode: 400,
				error: { error: { code: 'BadRequest', message: 'The request is malformed' } },
			});

			expect(error.message).toBe('The request is malformed');
		});

		it('passes the status code through with no custom message when neither 403 nor nested', () => {
			const error = delegatedApiError.call(ctx, { statusCode: 500 });

			expect(error.httpCode).toBe('500');
			expect(error.message).not.toContain('Sites.Read.All');
			expect(error.message).not.toBe(
				'The requested resource was not found. Check the Site, Library, Workbook, and Sheet values.',
			);
		});

		it('still builds its own message when the incoming error is already a NodeApiError', () => {
			// httpRequestWithAuthentication wraps any failure in a NodeApiError before this
			// function ever sees it. NodeApiError's constructor returns the same instance
			// untouched when asked to re-wrap one of its own, so this proves delegatedApiError
			// never passes that instance back in as the thing being wrapped.
			const alreadyWrapped = new NodeApiError(ctx.getNode(), { response: { status: 403 } });
			expect(alreadyWrapped.httpCode).toBe('403');

			const error = delegatedApiError.call(ctx, alreadyWrapped);

			expect(error).not.toBe(alreadyWrapped);
			expect(error.message).toBe(
				'Microsoft Graph refused this request. The credential may be missing a required permission, or the signed-in account may not have access to this resource',
			);
		});
	});
});
