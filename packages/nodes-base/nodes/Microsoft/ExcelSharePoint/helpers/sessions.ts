import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

/**
 * Runs `send` inside a workbook session: opens a session that persists
 * changes, hands `send` the `workbook-session-id` header to attach to its
 * request, then closes the session — even if `send` throws, so a failed
 * write doesn't leave a session open on Graph's side.
 */
export async function withWorkbookSession<T>(
	this: IExecuteFunctions,
	workbookRoot: string,
	send: (headers: IDataObject) => Promise<T>,
): Promise<T> {
	const { id } = await (microsoftApiRequest<{ id: string }>).call(
		this,
		'POST',
		`${workbookRoot}/workbook/createSession`,
		{ persistChanges: true },
	);
	const headers: IDataObject = { 'workbook-session-id': id };

	try {
		return await send(headers);
	} finally {
		await microsoftApiRequest.call(
			this,
			'POST',
			`${workbookRoot}/workbook/closeSession`,
			{},
			{},
			undefined,
			headers,
		);
	}
}
