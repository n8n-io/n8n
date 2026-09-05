import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

/**
 * Regression cover for INS-994: an oversized pasted image used to crash the LLM
 * call and then every turn after it, because the attachment was persisted to
 * thread history before the model call was known to have succeeded.
 *
 * The limits are enforced in base64-encoded bytes while a file on disk is
 * measured decoded, so the sizes below are derived from the decoded ceilings the
 * user-facing copy quotes — 7.5 MiB per file, 12 MiB combined.
 */
const PER_FILE_DECODED_LIMIT = 7.5 * 1024 * 1024;
const TOTAL_DECODED_LIMIT = 12 * 1024 * 1024;

/** Minimal PNG signature so the file reads as an image; the guards only look at size. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function writeImageOfSize(filePath: string, bytes: number): Promise<void> {
	const padding = Buffer.alloc(Math.max(0, bytes - PNG_SIGNATURE.length));
	await fs.writeFile(filePath, Buffer.concat([PNG_SIGNATURE, padding]));
}

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI oversized attachments @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		let tmpDir: string;

		test.beforeEach(async () => {
			tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'instance-ai-oversized-'));
		});

		test.afterEach(async () => {
			if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
		});

		test(
			'keeps an oversized file out of the composer and says why',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				const oversized = path.join(tmpDir, 'huge-screenshot.png');
				await writeImageOfSize(oversized, PER_FILE_DECODED_LIMIT + 1024);

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.getFileInput().setInputFiles(oversized);

				// Named so the user knows which file to shrink, and quoting the decoded
				// ceiling rather than the encoded one they cannot observe.
				const toast = n8n.notifications.getNotificationByTitleOrContent(/huge-screenshot\.png/);
				await expect(toast).toBeVisible();
				await expect(toast).toContainText('7.5 MB');

				// Nothing staged, so there is no way to send it.
				await expect(n8n.instanceAi.getComposerAttachments()).toHaveCount(0);
			},
		);

		test(
			'takes the files that fit when a batch busts the combined budget',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				// Sized so each file clears the per-file limit on its own but the third
				// crosses the combined budget once base64 inflation is applied.
				const perFile = Math.floor(TOTAL_DECODED_LIMIT / 2.5);
				const paths: string[] = [];
				for (const name of ['first.png', 'second.png', 'third.png']) {
					const filePath = path.join(tmpDir, name);
					await writeImageOfSize(filePath, perFile);
					paths.push(filePath);
				}

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.getFileInput().setInputFiles(paths);

				// A partial selection still goes through rather than failing wholesale.
				await expect(n8n.instanceAi.getComposerAttachments()).toHaveCount(2);
				await expect(
					n8n.notifications.getNotificationByTitleOrContent(/total for one message/),
				).toBeVisible();
			},
		);

		test(
			'stages a non-image attachment that fits',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				// Non-image files render through ChatFile rather than a thumbnail, so this
				// also covers the second marker `getComposerAttachments` has to match.
				const csv = path.join(tmpDir, 'rows.csv');
				await fs.writeFile(csv, 'id,name\n1,ok\n');

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.getFileInput().setInputFiles(csv);

				await expect(n8n.instanceAi.getComposerAttachments()).toHaveCount(1);
				await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
			},
		);

		test(
			'rejects an oversized attachment at the API even when the composer guard is bypassed',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				// The composer check is a convenience; the backend is authoritative. Post
				// straight to the endpoint to prove a scripted client cannot get past it.
				const response = await n8n.api.instanceAi.sendMessageResponse(crypto.randomUUID(), {
					message: 'look at this',
					attachments: [
						{
							type: 'file',
							// One byte over the encoded ceiling of 10 MiB.
							data: 'A'.repeat(10 * 1024 * 1024 + 1),
							mimeType: 'image/png',
							fileName: 'huge.png',
						},
					],
				});

				expect(response.status()).toBe(400);
				const body = await response.text();
				// Quotes the limit in the unit the user can act on, and says what to do.
				expect(body).toContain('7.5 MB');
				expect(body.toLowerCase()).toContain('smaller');
			},
		);

		test(
			'drops a provider-refused attachment so the next turn still works',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n, n8nContainer }) => {
				test.skip(!n8nContainer, 'Requires the proxy service to simulate a provider refusal');
				// Two full runs in one test: the refused turn plus the recovery turn.
				test.setTimeout(240_000);
				// Two full runs in one test: the refused turn plus the recovery turn.
				test.setTimeout(240_000);

				// A small image: our own guards accept it, so the refusal has to come from
				// the provider — which is the case the size checks cannot pre-empt (pixel
				// dimensions, per-provider ceilings) and the one that used to strand the
				// thread for good.
				const smallImage = path.join(tmpDir, 'small.png');
				await writeImageOfSize(smallImage, 2048);

				await n8nContainer.services.proxy.reset();

				// Refuse any model call that still carries image bytes. Matching on the
				// payload rather than a call count is what makes the second turn
				// meaningful: if the attachment were left in history, the follow-up would
				// match this same expectation and fail identically — which is exactly the
				// reported bug.
				// Registered before the catch-all: MockServer tries equal-priority
				// expectations in creation order, so the specific matcher wins.
				await n8nContainer.services.proxy.createExpectation({
					httpRequest: {
						method: 'POST',
						path: '/v1/messages',
						// Match our own image's bytes: base64 of the PNG signature. Matching a
						// generic marker like "base64" also hits tool schemas, so every request
						// would be refused and the recovery turn could never pass.
						body: { type: 'REGEX', regex: '[\\s\\S]*iVBORw0KGgo[\\s\\S]*' },
					},
					httpResponse: {
						statusCode: 400,
						headers: { 'Content-Type': ['application/json'] },
						body: JSON.stringify({
							type: 'error',
							error: {
								type: 'invalid_request_error',
								message:
									'messages.0.content.1.image: image exceeds 10 MB maximum: 12058221 bytes > 10485760 bytes',
							},
						}),
					},
					times: { unlimited: true },
				});

				// Every other model call succeeds with a minimal assistant turn.
				await n8nContainer.services.proxy.createExpectation({
					httpRequest: { method: 'POST', path: '/v1/messages' },
					httpResponse: {
						statusCode: 200,
						headers: { 'Content-Type': ['text/event-stream'] },
						body: [
							'event: message_start',
							'data: {"type":"message_start","message":{"model":"claude-sonnet-4-6","id":"msg_recovered","type":"message","role":"assistant","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"output_tokens":1}}}',
							'',
							'event: content_block_start',
							'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
							'',
							'event: content_block_delta',
							'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Back on track without the attachment."}}',
							'',
							'event: content_block_stop',
							'data: {"type":"content_block_stop","index":0}',
							'',
							'event: message_delta',
							'data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"input_tokens":1,"output_tokens":8}}',
							'',
							'event: message_stop',
							'data: {"type":"message_stop"}',
							'',
						].join('\n'),
					},
					times: { unlimited: true },
				});

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.getFileInput().setInputFiles(smallImage);
				await n8n.instanceAi.getChatInput().fill('What is in this screenshot?');
				await n8n.instanceAi.getSendButton().click();

				// The first turn fails on the refusal. Matching either the provider text or
				// our own guidance keeps this focused on behaviour — which surface renders
				// the message is covered by the unit tests for getUserFacingErrorMessage.
				await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText(
					/exceeds 10 MB maximum|too large/i,
					{ timeout: 90_000 },
				);
				await n8n.instanceAi.waitForRunComplete();

				// Assert the mechanism directly, not just its effect: the persisted turn keeps
				// the user's text but no longer carries an inline `file` part.
				const persisted = await n8n.api.instanceAi.getRawThreadMessagesResponse(
					n8n.instanceAi.getCurrentThreadId(),
				);
				expect(persisted.status()).toBe(200);
				const persistedBody = await persisted.text();
				expect(persistedBody).toContain('What is in this screenshot?');
				expect(persistedBody).not.toContain('"type":"file"');

				// The regression itself: a plain follow-up in the same thread now completes.
				// Before the fix the attachment stayed in history, so this request still
				// carried image bytes, matched the refusal expectation above, and failed
				// identically — the "repeatedly crashes" half of INS-994.
				await n8n.instanceAi.sendMessage('Never mind the image — just say hello.');
				await expect(
					n8n.instanceAi.getPanelText(/Back on track without the attachment/),
				).toBeVisible({ timeout: 90_000 });
			},
		);
	},
);
