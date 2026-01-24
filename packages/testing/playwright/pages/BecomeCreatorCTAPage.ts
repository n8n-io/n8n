import { BasePage } from './BasePage';

export class BecomeCreatorCTAPage extends BasePage {
	getCloseBecomeTemplateCreatorCtaButton() {
		return this.page.getByTestId('close-become-template-creator-cta');
	}
}
