import { compareSortKeys, toSortKey } from '../sortKey';
import type { Position, State } from '../state';
import type { Item, PollConfig, SortKey } from '../types';

export type Outcome = { items: Item[]; state: State; baseline?: boolean };

export const ascending = (config: PollConfig, items: Item[]) =>
	[...items].sort((a, b) =>
		compareSortKeys(toSortKey(config.timestamp(a)), toSortKey(config.timestamp(b))),
	);

export const headPosition = (since?: SortKey): Position =>
	since === undefined ? {} : { since: Number(since) };
