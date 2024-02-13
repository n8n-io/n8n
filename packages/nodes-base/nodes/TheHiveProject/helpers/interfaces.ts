export const enum TLP {
	white,
	green,
	amber,
	red,
}

export type QueryScope = { query: string; id?: string; restrictTo?: string };
