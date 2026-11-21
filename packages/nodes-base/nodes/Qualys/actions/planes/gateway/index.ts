/**
 * The API gateway, as used by the EASM profile endpoints: a zero-based page
 * number with no total, which stops when a page comes back short or 404s.
 */
import type { Operation } from '../../resources';
import type { Pager } from '../../shared/paging';

/** EASM on the gateway: a zero-based page number and a `hasNextPage` flag. */
export function gatewayPager(definition: Operation): Pager {
	let pageNumber = 0;
	let exhausted = false;

	return {
		next: () =>
			exhausted
				? undefined
				: {
						plane: 'gateway' as const,
						endpoint: definition.endpoint,
						method: definition.method,
						qs: { pageNumber },
						emptyOn404: definition.emptyOn404,
					},
		advance: (body) => {
			// `hasNextPage` is the only progress signal; a page past the end answers
			// 404, which emptyOn404 turns into an empty body.
			if (body.hasNextPage !== true) {
				exhausted = true;
				return;
			}

			pageNumber += 1;
		},
	};
}
