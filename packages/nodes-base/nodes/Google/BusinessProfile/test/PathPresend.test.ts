import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import {
	localPostsPresend,
	postNamePresend,
	reviewPresend,
	reviewReplyPresend,
	reviewsPresend,
} from '../GenericFunctions';

describe('GenericFunctions - path presend', () => {
	const account = 'accounts/104578213969250394851';
	const location = 'locations/7183021945602238911';
	const postName = `${account}/${location}/localPosts/3`;

	const run = async (
		presend: (this: IExecuteSingleFunctions, opts: IHttpRequestOptions) => Promise<unknown>,
		parameters: Record<string, string>,
	) => {
		const context = {
			getNodeParameter: (name: string) => parameters[name],
			getNode: vi.fn(),
		} as unknown as IExecuteSingleFunctions;
		const opts = await presend.call(context, { url: '' });
		return (opts as IHttpRequestOptions).url;
	};

	it('should build the post url from the post name', async () => {
		expect(await run(postNamePresend, { post: postName })).toBe(`/${postName}`);
	});

	it('should reject a post name with a relative segment', async () => {
		await expect(run(postNamePresend, { post: `${postName}/../../admins/7` })).rejects.toThrow(
			'must have the form',
		);
	});

	it('should reject a post name of another resource', async () => {
		await expect(run(postNamePresend, { post: 'accounts/9/admins/7' })).rejects.toThrow(
			'must have the form',
		);
	});

	it('should build the posts url from the account and location', async () => {
		expect(await run(localPostsPresend, { account, location })).toBe(
			`/${account}/${location}/localPosts`,
		);
	});

	it('should reject a location with a relative segment', async () => {
		await expect(
			run(localPostsPresend, { account, location: 'locations/../../accounts/9' }),
		).rejects.toThrow('must have the form');
	});

	it('should build the reviews url from the account and location', async () => {
		expect(await run(reviewsPresend, { account, location })).toBe(
			`/${account}/${location}/reviews`,
		);
	});

	it('should build the review url from a review id or a review name', async () => {
		const expected = `/${account}/${location}/reviews/abc`;
		expect(await run(reviewPresend, { account, location, review: 'abc' })).toBe(expected);
		expect(
			await run(reviewPresend, {
				account,
				location,
				review: `${account}/${location}/reviews/abc/reply`,
			}),
		).toBe(expected);
	});

	it('should send a review id with slashes as one segment', async () => {
		const url = await run(reviewPresend, {
			account,
			location,
			review: 'x/accounts/9/admins',
		});
		expect(String(url)).toBe(`/${account}/${location}/reviews/x%2Faccounts%2F9%2Fadmins`);
	});

	it('should reject a review id with a dot segment', async () => {
		await expect(
			run(reviewPresend, { account, location, review: 'x/../../../../accounts/9/admins' }),
		).rejects.toThrow('Invalid identifier');
	});

	it('should build the reply url', async () => {
		expect(await run(reviewReplyPresend, { account, location, review: 'abc' })).toBe(
			`/${account}/${location}/reviews/abc/reply`,
		);
	});

	it('should reject a review account with a relative segment', async () => {
		await expect(
			run(reviewReplyPresend, { account: 'accounts/../x', location, review: 'abc' }),
		).rejects.toThrow('must have the form');
	});
});
