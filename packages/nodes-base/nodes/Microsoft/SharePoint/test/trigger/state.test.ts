import {
	clearError,
	cursorFor,
	ERROR_REPEAT_MS,
	errorKeyOf,
	noteError,
	rearm,
	saveCursor,
	scopeOf,
	type PollState,
} from '../../trigger/state';

describe('SharePoint trigger: poll state', () => {
	const scope = scopeOf('microsoftOAuth2Api', 'documentLibrary', 'site-1', 'drive-1');

	describe('cursorFor', () => {
		it('reuses a stored link while the scope is unchanged', () => {
			expect(cursorFor({ scope, cursor: 'https://link' }, scope)).toEqual({
				kind: 'link',
				url: 'https://link',
			});
		});

		it.each([
			['nothing is stored yet', {}],
			[
				'the site differs',
				{ scope: scopeOf('microsoftOAuth2Api', 'documentLibrary', 'site-2', 'drive-1') },
			],
			[
				'the library differs',
				{ scope: scopeOf('microsoftOAuth2Api', 'documentLibrary', 'site-1', 'drive-2') },
			],
			[
				'the credential differs',
				{
					scope: scopeOf(
						'microsoftEntraServicePrincipalApi',
						'documentLibrary',
						'site-1',
						'drive-1',
					),
				},
			],
			[
				'the watched resource differs',
				{ scope: scopeOf('microsoftOAuth2Api', 'list', 'site-1', 'drive-1') },
			],
			['the stored link is blank', { scope, cursor: '' }],
		] as Array<[string, PollState]>)('starts from now when %s', (_name, stored) => {
			expect(cursorFor({ cursor: 'https://link', ...stored }, scope)).toEqual({ kind: 'latest' });
		});
	});

	describe('cursor writes', () => {
		it('saveCursor stores the link against its scope', () => {
			const state: PollState = {};
			saveCursor(state, scope, 'https://link');

			expect(state).toEqual({ scope, cursor: 'https://link' });
		});

		it('rearm drops the link so the next poll starts from now', () => {
			const state: PollState = { scope: 'old', cursor: 'https://link' };
			rearm(state, scope);

			expect(state).toEqual({ scope });
			expect(cursorFor(state, scope)).toEqual({ kind: 'latest' });
		});
	});

	describe('noteError', () => {
		it('reports the first failure at once', () => {
			expect(noteError({}, 'Error:gone', 1_000)).toBe(true);
		});

		it('stays quiet while the same failure repeats inside the hour', () => {
			const state: PollState = {};
			noteError(state, 'Error:gone', 0);

			expect(noteError(state, 'Error:gone', ERROR_REPEAT_MS - 1)).toBe(false);
		});

		it('reports the same failure again once the hour is up', () => {
			const state: PollState = {};
			noteError(state, 'Error:gone', 0);

			expect(noteError(state, 'Error:gone', ERROR_REPEAT_MS)).toBe(true);
		});

		it('reports a different failure at once, even inside the hour', () => {
			const state: PollState = {};
			noteError(state, 'Error:gone', 0);

			expect(noteError(state, 'Error:denied', 1)).toBe(true);
		});

		it('does not push the window back on every quiet poll', () => {
			// Stamping a suppressed poll would move the next report an hour further
			// out each tick, so a permanent failure would never be reported again.
			const state: PollState = {};
			noteError(state, 'Error:gone', 0);
			noteError(state, 'Error:gone', ERROR_REPEAT_MS - 1);

			expect(noteError(state, 'Error:gone', ERROR_REPEAT_MS)).toBe(true);
		});

		it('reports again once a success has cleared the record', () => {
			const state: PollState = {};
			noteError(state, 'Error:gone', 0);
			clearError(state);

			expect(noteError(state, 'Error:gone', 1)).toBe(true);
		});
	});

	describe('errorKeyOf', () => {
		it.each([
			[new Error('gone'), 'Error:gone'],
			[Object.assign(new Error('nope'), { name: 'NodeApiError' }), 'NodeApiError:nope'],
			['a thrown string', 'a thrown string'],
		])('keys %s', (error, expected) => {
			expect(errorKeyOf(error)).toBe(expected);
		});

		it('separates two failures that differ only in message', () => {
			expect(errorKeyOf(new Error('a'))).not.toBe(errorKeyOf(new Error('b')));
		});
	});
});
