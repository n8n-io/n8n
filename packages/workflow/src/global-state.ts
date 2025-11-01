import { deepCopy } from './utils';

export interface GlobalState {
	defaultTimezone: string;
}

let globalState: GlobalState = { defaultTimezone: 'America/New_York' };

export function setGlobalState(state: GlobalState) {
	globalState = state;
}

export function getGlobalState() {
	return deepCopy(globalState);
}
