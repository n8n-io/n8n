import type { IPollFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getBaseAccessToken as getBaseAccessTokenV1 } from '../v1/GenericFunctions';
import type { ICtx as ICtxV1 } from '../v1/Interfaces';
import { getBaseAccessToken as getBaseAccessTokenV2 } from '../v2/GenericFunctions';
import type { ICtx as ICtxV2 } from '../v2/actions/Interfaces';

const token = 'api-token-value';

const response = { status: 401, data: { detail: 'Invalid token' } };

// `helpers.httpRequest` rejects with the raw axios error.
const axiosError = () =>
	Object.assign(new Error('Request failed with status code 401'), {
		isAxiosError: true,
		config: { headers: { Authorization: `Token ${token}` } },
		response,
	});

// `helpers.request` moves the axios config to `options` and rewrites the message.
const legacyRequestError = () =>
	Object.assign(new Error(`401 - ${JSON.stringify(response.data)}`), {
		isAxiosError: true,
		config: undefined,
		options: { headers: { Authorization: `Token ${token}` } },
		response,
		statusCode: 401,
		error: response.data,
	});

const buildContext = (helpers: Partial<IPollFunctions['helpers']>) =>
	({
		getNode: () => ({ name: 'SeaTable Trigger', type: 'n8n-nodes-base.seaTableTrigger' }),
		helpers,
	}) as unknown as IPollFunctions;

describe('SeaTable > getBaseAccessToken', () => {
	describe.each([
		['v1', getBaseAccessTokenV1, 'request', legacyRequestError],
		['v2', getBaseAccessTokenV2, 'httpRequest', axiosError],
	] as const)('%s', (_version, getBaseAccessToken, helper, requestError) => {
		const ctx = () =>
			({
				credentials: { environment: 'selfHosted', domain: 'https://seatable.example.com', token },
			}) as ICtxV1 & ICtxV2;

		it('should store the base access token on success', async () => {
			const base = { access_token: 'base-token', dtable_uuid: 'uuid' };
			const context = buildContext({ [helper]: vi.fn().mockResolvedValue(base) });
			const c = ctx();

			await getBaseAccessToken.call(context, c);

			expect(c.base).toEqual(base);
		});

		it('should throw a NodeApiError without request headers when the request fails', async () => {
			const context = buildContext({ [helper]: vi.fn().mockRejectedValue(requestError()) });

			const error = await getBaseAccessToken.call(context, ctx()).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(NodeApiError);
			const { message, description } = error as NodeApiError;
			for (const text of [JSON.stringify(error), message, description]) {
				expect(text).not.toContain(token);
			}
		});
	});
});
