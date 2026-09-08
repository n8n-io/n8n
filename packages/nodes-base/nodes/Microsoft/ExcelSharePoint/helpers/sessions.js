import { microsoftApiRequest } from '../transport';
/**
 * Best-effort: an unclosed session simply expires on Graph's side, so a
 * failure here must never mask `send`'s real result or error.
 */
async function closeSessionQuietly(workbookRoot, headers) {
    try {
        await microsoftApiRequest.call(this, 'POST', `${workbookRoot}/workbook/closeSession`, {}, {}, undefined, headers);
    }
    catch {
        // Swallowed on purpose, see above.
    }
}
/**
 * Runs `send` inside a workbook session: opens a session that persists
 * changes, hands `send` the `workbook-session-id` header to attach to its
 * request, then closes the session — even if `send` throws, so a failed
 * write doesn't leave a session open on Graph's side.
 */
export async function withWorkbookSession(workbookRoot, send) {
    const { id } = await (microsoftApiRequest).call(this, 'POST', `${workbookRoot}/workbook/createSession`, { persistChanges: true });
    const headers = { 'workbook-session-id': id };
    let result;
    try {
        result = await send(headers);
    }
    catch (sendError) {
        await closeSessionQuietly.call(this, workbookRoot, headers);
        throw sendError;
    }
    await closeSessionQuietly.call(this, workbookRoot, headers);
    return result;
}
//# sourceMappingURL=sessions.js.map