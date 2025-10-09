import { BasePage } from './BasePage';

export class BecomeCreatorCTAPage extends BasePage {
	getBecomeTemplateCreatorCta() {
		return this.page.getByTestId('become-template-creator-cta');
	}

	getCloseBecomeTemplateCreatorCtaButton() {
		return this.page.getByTestId('close-become-template-creator-cta');
	}

	async closeBecomeTemplateCreatorCta() {
		await this.getCloseBecomeTemplateCreatorCtaButton().click();
	}
}
