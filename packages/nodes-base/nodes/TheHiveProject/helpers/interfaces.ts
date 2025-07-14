export const TLPs = {
	white: 0,
	green: 1,
	amber: 2,
	red: 3,
};

export type TLP = (typeof TLPs)[keyof typeof TLPs];

export type QueryScope = { query: string; id?: string; restrictTo?: string };
