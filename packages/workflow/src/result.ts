export type ResultOk<T> = { ok: true; result: T };
export type ResultError<E> = { ok: false; error: E };
export type Result<T, E> = ResultOk<T> | ResultError<E>;

export const createResultOk = <T>(data: T): ResultOk<T> => ({
	ok: true,
	result: data,
});

export const createResultError = <E = unknown>(error: E): ResultError<E> => ({
	ok: false,
	error,
});
