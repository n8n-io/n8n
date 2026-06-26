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
	});
});
