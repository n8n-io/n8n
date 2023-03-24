import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
// import OTPAuth from 'otpauth';
const LOGIN_URL = 'https://github.com/login';

puppeteer.use(pluginStealth());

export async function pptrLogin(email: string, password: string, token: string) {
	const browser = await puppeteer.launch({ headless: true });

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

	await page.waitForTimeout(2000);

	const _ghHandle = await page.evaluate(() => {
		return Array.from(document.getElementsByTagName('meta'))
			.find((m) => m.getAttribute('name') === 'octolytics-actor-login')
			?.getAttribute('content');
	});

	await page.goto(`https://github.com/${_ghHandle}`);

	// const bio =
	// 	(await page.waitForSelector('.user-profile-bio'))?.evaluate((el) => el.textContent?.trim()) ??
	// 	'n/a';

	// const followers =
	// 	(await page.waitForSelector('span.text-bold.color-fg-default'))?.evaluate((el) =>
	// 		el.textContent?.trim(),
	// 	) ?? '0';

	// const location =
	// 	(await page.waitForSelector('[itemProp="homeLocation"]'))?.evaluate((el) =>
	// 		el.textContent?.trim(),
	// 	) ?? 'n/a';

	const [description, followers, location] = await Promise.all(
		[
			// '.p-nickname',
			'.user-profile-bio',
			'span.text-bold.color-fg-default',
			'[itemProp="homeLocation"]',
		].map(async (selector) => {
			return (
				(await page.waitForSelector(selector))?.evaluate((el) => el.textContent?.trim()) ?? 'n/a'
			);
		}),
	);

	return {
		'GitHub User Handle': _ghHandle,
		'GitHub User Description': description,
		'GitHub User Follower Count': followers,
		'GitHub User Location': location,
	};
}
