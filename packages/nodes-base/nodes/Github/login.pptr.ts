import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';

const LOGIN_URL = 'https://github.com/login';

puppeteer.use(pluginStealth());

export async function pptrLogin(email: string, password: string, token: string, ghHandle: string) {
	const browser = await puppeteer.launch();

	const page = await browser.newPage();

	await page.goto(LOGIN_URL);

	const emailField = await page.waitForSelector('#login_field');

	if (!emailField) throw new Error('Failed to find email');

	const passwordField = await page.waitForSelector('#password');

	if (!passwordField) throw new Error('Failed to find pw');

	const submitButton = await page.waitForSelector('.btn-primary');

	if (!submitButton) throw new Error('Failed to find submit');

	await emailField.type(email);
	await passwordField.type(password);
	await submitButton.click();

	// totp

	const totpField = await page.waitForSelector('#app_totp');

	if (!totpField) throw new Error('Failed to find totp field');

	await totpField.type(token);

	// @TODO: Check for 2fa error
	// throw new Error('Access denied: 2FA code is incorrect');

	await page.goto(`https://github.com/${ghHandle}`);

	const [handle, description, followers, location] = await Promise.all(
		[
			'.p-nickname',
			'.user-profile-bio',
			'.text-bold.color-fg-default',
			'[itemProp="homeLocation"]',
		].map(async (selector) => {
			return (await page.waitForSelector(selector))?.evaluate((el) => el.textContent?.trim());
		}),
	);

	return {
		'GitHub User Handle': handle,
		'GitHub User Description': description,
		'GitHub User Follower Count': followers,
		'GitHub User Location': location,
	};
}
