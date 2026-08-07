import type { INodeProperties } from 'n8n-workflow';
import { displayParameter } from 'n8n-workflow';

import { messageFields } from '../../V2/MessageDescription';

describe('MessageDescription', () => {
	describe('Custom Bot Profile Photo', () => {
		const postOptions = messageFields.find(
			(field) =>
				field.name === 'otherOptions' &&
				(field.displayOptions?.show?.operation as string[] | undefined)?.includes('post'),
		);

		const botProfileVariants = (postOptions?.options ?? []).filter(
			(option) => 'name' in option && option.name === 'botProfile',
		) as INodeProperties[];

		const visibleVariants = (typeVersion: number, authentication: string) =>
			botProfileVariants.filter((variant) =>
				displayParameter({}, variant, { typeVersion }, null, { authentication }),
			);

		it('should define one variant per version range', () => {
			expect(botProfileVariants).toHaveLength(2);
		});

		it.each([
			['oAuth2', 2.5],
			['accessToken', 2.5],
			['accessToken', 2.6],
		])('should be shown with %s auth on version %s', (authentication, typeVersion) => {
			expect(visibleVariants(typeVersion, authentication)).toHaveLength(1);
		});

		it('should be hidden with OAuth2 auth from version 2.6, where Slack ignores it', () => {
			expect(visibleVariants(2.6, 'oAuth2')).toHaveLength(0);
		});

		it('should only mention the chat:write.customize scope on the 2.6+ variant', () => {
			const [legacy] = visibleVariants(2.5, 'oAuth2');
			const [current] = visibleVariants(2.6, 'accessToken');

			expect(legacy.description).not.toContain('chat:write.customize');
			expect(current.description).toContain('chat:write.customize');
		});
	});
});
