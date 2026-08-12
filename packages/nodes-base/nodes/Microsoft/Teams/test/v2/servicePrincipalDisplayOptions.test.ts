import type { INodeProperties } from 'n8n-workflow';

import { MicrosoftTeamsTrigger } from '../../MicrosoftTeamsTrigger.node';
import { versionDescription } from '../../v2/actions/versionDescription';
import { SERVICE_PRINCIPAL_AUTH } from '../../v2/transport';

const actionProps = versionDescription.properties;
const triggerProps = new MicrosoftTeamsTrigger().description.properties;

/** All resolved copies of a field (by name) — there can be several (RLC variants). */
const byName = (props: INodeProperties[], name: string) =>
	props.filter((property) => property.name === name);

const isSpHidden = (property?: INodeProperties) =>
	Array.isArray(property?.displayOptions?.hide?.['/authentication']) &&
	property?.displayOptions?.hide?.['/authentication']?.includes(SERVICE_PRINCIPAL_AUTH);

const isSpShown = (property?: INodeProperties) =>
	property?.displayOptions?.show?.['/authentication']?.includes(SERVICE_PRINCIPAL_AUTH) === true;

describe('Microsoft Teams Service Principal displayOptions contract', () => {
	describe('credential entry uses the un-prefixed show.authentication key', () => {
		it.each([
			['action node', versionDescription.credentials ?? []],
			['trigger node', new MicrosoftTeamsTrigger().description.credentials ?? []],
		])('%s gates the SP credential with show.authentication (no slash prefix)', (_l, creds) => {
			const spCredential = creds.find((c) => c.name === SERVICE_PRINCIPAL_AUTH);
			expect(spCredential?.required).toBe(true);
			expect(spCredential?.displayOptions?.show?.authentication).toEqual([SERVICE_PRINCIPAL_AUTH]);
			// the credential entry must NOT use the slash-prefixed field-level key
			expect(spCredential?.displayOptions?.show?.['/authentication']).toBeUndefined();
		});
	});

	describe('chatMessage — hidden under SP via the slash-prefixed field-level key', () => {
		it('operation selector carries hide["/authentication"] = [SP]', () => {
			const op = actionProps.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('chatMessage'),
			);
			expect(isSpHidden(op)).toBe(true);
			// distinct from the un-prefixed credential gate
			expect(op?.displayOptions?.hide?.authentication).toBeUndefined();
		});

		it('every chatMessage field copy is hidden under SP', () => {
			const chatFields = actionProps.filter((p) =>
				p.displayOptions?.show?.resource?.includes('chatMessage'),
			);
			// the chatId RLC, message, contentType, options, messageId, send-and-wait props…
			const gatedFields = chatFields.filter((p) => p.type !== 'notice' && p.name !== 'operation');
			expect(gatedFields.length).toBeGreaterThan(0);
			for (const field of gatedFields) {
				expect(isSpHidden(field)).toBe(true);
			}
		});

		it('shows an SP notice for the chatMessage resource', () => {
			const notice = actionProps.find(
				(p) =>
					p.type === 'notice' &&
					p.displayOptions?.show?.resource?.includes('chatMessage') &&
					p.displayOptions?.show?.authentication?.includes(SERVICE_PRINCIPAL_AUTH),
			);
			expect(notice).toBeDefined();
			expect(notice?.displayOptions?.show?.authentication).toEqual([SERVICE_PRINCIPAL_AUTH]);
		});
	});

	describe('channelMessage — only create hidden under SP', () => {
		it('create fields are hidden, getAll fields are shown', () => {
			const createFields = actionProps.filter(
				(p) =>
					p.type !== 'notice' &&
					p.displayOptions?.show?.resource?.includes('channelMessage') &&
					p.displayOptions?.show?.operation?.includes('create'),
			);
			expect(createFields.length).toBeGreaterThan(0);
			for (const field of createFields) {
				expect(isSpHidden(field)).toBe(true);
			}

			const getAllFields = actionProps.filter(
				(p) =>
					p.type !== 'notice' &&
					p.displayOptions?.show?.resource?.includes('channelMessage') &&
					p.displayOptions?.show?.operation?.includes('getAll'),
			);
			expect(getAllFields.length).toBeGreaterThan(0);
			for (const field of getAllFields) {
				expect(isSpHidden(field)).toBe(false);
			}
		});

		it('has both the create and the getAll SP notices', () => {
			const notices = actionProps.filter(
				(p) =>
					p.type === 'notice' &&
					p.displayOptions?.show?.resource?.includes('channelMessage') &&
					p.displayOptions?.show?.authentication?.includes(SERVICE_PRINCIPAL_AUTH),
			);
			const operations = notices.flatMap((n) => n.displayOptions?.show?.operation ?? []);
			expect(operations).toContain('create');
			expect(operations).toContain('getAll');
		});
	});

	describe('task:getAll — plan picker shown, member-mode hidden under SP', () => {
		const taskGetAllFields = actionProps.filter(
			(p) =>
				p.displayOptions?.show?.resource?.includes('task') &&
				p.displayOptions?.show?.operation?.includes('getAll'),
		);

		it('tasksFor is hidden under SP', () => {
			const tasksFor = taskGetAllFields.find((p) => p.name === 'tasksFor');
			expect(isSpHidden(tasksFor)).toBe(true);
		});

		it('the member-mode group picker (first groupId) is hidden under SP', () => {
			const groupCopies = byName(taskGetAllFields, 'groupId');
			expect(groupCopies.length).toBeGreaterThan(0);
			expect(isSpHidden(groupCopies[0])).toBe(true);
		});

		it('an SP-shown plan picker exists', () => {
			const planCopies = byName(taskGetAllFields, 'planId');
			expect(planCopies.some((p) => isSpShown(p))).toBe(true);
		});

		it('the SP-shown plan picker defaults to By-ID mode with no auto-firing list', () => {
			const spPlan = byName(taskGetAllFields, 'planId').find((p) => isSpShown(p));
			expect(spPlan).toBeDefined();
			// By-ID default so the dropdown never auto-fires getPlans with an empty groupId
			// (which would hit the SP empty-id validation error).
			expect((spPlan?.default as { mode?: string })?.mode).toBe('id');
			// no list mode, and no group dependency that would trigger a load.
			expect(spPlan?.modes?.some((m) => m.name === 'list')).toBe(false);
			expect(spPlan?.typeOptions?.loadOptionsDependsOn).toBeUndefined();
		});
	});

	describe('task:create — By-ID plan/bucket under SP, group hidden', () => {
		const fields = actionProps.filter(
			(p) =>
				p.displayOptions?.show?.resource?.includes('task') &&
				p.displayOptions?.show?.operation?.includes('create'),
		);

		it('the OAuth2 group picker is hidden under SP', () => {
			const group = byName(fields, 'groupId').find((p) => isSpHidden(p));
			expect(group).toBeDefined();
		});

		it.each(['planId', 'bucketId'])(
			'an SP-shown By-ID %s picker exists (no list, no deps)',
			(name) => {
				const spCopy = byName(fields, name).find((p) => isSpShown(p));
				expect(spCopy).toBeDefined();
				expect((spCopy?.default as { mode?: string })?.mode).toBe('id');
				expect(spCopy?.modes?.some((m) => m.name === 'list')).toBe(false);
				expect(spCopy?.typeOptions?.loadOptionsDependsOn).toBeUndefined();
			},
		);

		it.each(['planId', 'bucketId'])('the OAuth2 list-mode %s picker is hidden under SP', (name) => {
			const oauthCopy = byName(fields, name).find((p) => isSpHidden(p));
			expect(oauthCopy).toBeDefined();
		});

		// `assignedTo` (member RLC) lives inside the `options` collection.
		const optionFields = (fields.find((p) => p.name === 'options')?.options ??
			[]) as INodeProperties[];
		const assignedToCopies = optionFields.filter((o) => o.name === 'assignedTo');

		it('an SP-shown By-ID assignedTo picker exists (no list, no deps)', () => {
			const spCopy = assignedToCopies.find((p) => isSpShown(p));
			expect(spCopy).toBeDefined();
			expect((spCopy?.default as { mode?: string })?.mode).toBe('id');
			expect(spCopy?.modes?.some((m) => m.name === 'list')).toBe(false);
			expect(spCopy?.typeOptions?.loadOptionsDependsOn).toBeUndefined();
		});

		it('the OAuth2 list-mode assignedTo picker is hidden under SP', () => {
			expect(assignedToCopies.some((p) => isSpHidden(p))).toBe(true);
		});
	});

	describe('task:update — By-ID plan/bucket under SP inside updateFields, group hidden', () => {
		const updateFields = actionProps.find(
			(p) =>
				p.name === 'updateFields' &&
				p.displayOptions?.show?.resource?.includes('task') &&
				p.displayOptions?.show?.operation?.includes('update'),
		);
		const options = (updateFields?.options ?? []) as INodeProperties[];
		const byOptName = (name: string) => options.filter((o) => o.name === name);

		it('the OAuth2 group picker is hidden under SP', () => {
			expect(byOptName('groupId').some((p) => isSpHidden(p))).toBe(true);
		});

		it.each(['planId', 'bucketId'])(
			'an SP-shown By-ID %s picker exists (no list, no deps)',
			(name) => {
				const spCopy = byOptName(name).find((p) => isSpShown(p));
				expect(spCopy).toBeDefined();
				expect((spCopy?.default as { mode?: string })?.mode).toBe('id');
				expect(spCopy?.modes?.some((m) => m.name === 'list')).toBe(false);
				expect(spCopy?.typeOptions?.loadOptionsDependsOn).toBeUndefined();
			},
		);

		it.each(['planId', 'bucketId'])('the OAuth2 list-mode %s picker is hidden under SP', (name) => {
			expect(byOptName(name).some((p) => isSpHidden(p))).toBe(true);
		});

		it('an SP-shown By-ID assignedTo picker exists (no list, no deps)', () => {
			const spCopy = byOptName('assignedTo').find((p) => isSpShown(p));
			expect(spCopy).toBeDefined();
			expect((spCopy?.default as { mode?: string })?.mode).toBe('id');
			expect(spCopy?.modes?.some((m) => m.name === 'list')).toBe(false);
			expect(spCopy?.typeOptions?.loadOptionsDependsOn).toBeUndefined();
		});

		it('the OAuth2 list-mode assignedTo picker is hidden under SP', () => {
			expect(byOptName('assignedTo').some((p) => isSpHidden(p))).toBe(true);
		});
	});

	describe('trigger — watch-all and chat fields hidden under SP', () => {
		it.each(['watchAllTeams', 'watchAllChannels'])('%s carries hide["/authentication"]', (name) => {
			const field = triggerProps.find((p) => p.name === name);
			expect(isSpHidden(field)).toBe(true);
		});

		it.each(['watchAllChats', 'chatId'])('chat field %s is hidden under SP', (name) => {
			const field = triggerProps.find((p) => p.name === name);
			expect(isSpHidden(field)).toBe(true);
		});

		// Regression: the watch-all toggles are hidden under SP, so they resolve to `undefined`.
		// The dependent pickers must gate on `_cnd: { not: true }` (matches `false` AND `undefined`),
		// not a plain `[false]` — otherwise the Team/Channel pickers disappear under SP.
		it.each(['teamId', 'channelId'])(
			'the %s picker gates watchAllTeams with _cnd:{not:true} (renders under SP)',
			(name) => {
				const field = triggerProps.find((p) => p.name === name);
				expect(field?.displayOptions?.show?.watchAllTeams).toEqual([{ _cnd: { not: true } }]);
			},
		);

		it('the channelId picker gates watchAllChannels with _cnd:{not:true} (renders under SP)', () => {
			const channel = triggerProps.find((p) => p.name === 'channelId');
			expect(channel?.displayOptions?.show?.watchAllChannels).toEqual([{ _cnd: { not: true } }]);
		});
	});
});
