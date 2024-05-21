import { deepCopy } from './utils';

export interface GlobalState {
	defaultTimezone: string;
}

let globalState: GlobalState = { defaultTimezone: 'Europe/Berlin' };

export function setGlobalState(state: GlobalState) {
	globalState = state;
}

export function getGlobalState() {
	return deepCopy(globalState);
}
