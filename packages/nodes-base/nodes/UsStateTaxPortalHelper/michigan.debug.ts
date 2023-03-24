import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';

const MICHIGAN_LOGIN_URL = 'https://mto.treasury.michigan.gov/eai/mtologin/authenticate';

puppeteer.use(pluginStealth());

export async function michiganLogin(username: string, password: string, fein: string) {
	const browser = await puppeteer.launch({ headless: true });

	const page = await browser.newPage();

	page.on('pageerror', () => {
		throw new Error('Failed to create new account');
	});

	await page.goto(MICHIGAN_LOGIN_URL);

	await page.deleteCookie(...(await page.cookies()));

	const usernameField = await page.waitForSelector('#userid');
	const passwordField = await page.waitForSelector('#password');
	const loginSubmit = await page.waitForSelector('#submit-btn');

	if (!usernameField) throw new Error('Failed to find #userid');
	if (!passwordField) throw new Error('Failed to find #password');
	if (!loginSubmit) throw new Error('Failed to find #submit-btn');

	await usernameField.type(username);
	await passwordField.type(password);
	await loginSubmit.click();

	// mtoHome

	try {
		const logoutOther = await page.waitForSelector(
			'text/Logout the other session and continue with a new session',
		);

		await logoutOther?.click();

		const next = await page.waitForSelector('.col-md-2');
		await next?.click();
	} catch {}

	const salesTax = await page.waitForSelector('text/Sales, Use, and Withholding (SUW) Tax');

	if (!salesTax) throw new Error('Failed to find "Sales, Use, and Withholding (SUW) Tax"');

	await salesTax.click();

	const relationship = await page.waitForSelector('text/Create a New Relationship');

	if (!relationship) throw new Error('Failed to find "Create a New Relationship"');

	await relationship.click();

	// number input

	const numberInput = await page.waitForSelector('[placeholder="__-_______"]');

	if (!numberInput) throw new Error('Failed to find placeholder "__-_______"');

	await numberInput.type(fein); // 111111111

	// btnBasicBusinessDetailsSubmit

	const detailsSubmit = await page.waitForSelector('#btnBasicBusinessDetailsSubmit');

	if (!detailsSubmit) throw new Error('Failed to find "#btnBasicBusinessDetailsSubmit');

	await detailsSubmit.click();

	const screenshot = await page.screenshot({ fullPage: true });

	// logout

	const dropdownToggle = await page.waitForSelector('.dropdown-toggle');

	if (!dropdownToggle) throw new Error('Failed to find ".dropdown-toggle"');

	await dropdownToggle.click();

	const logout = await page.waitForSelector('text/ Log Out');

	if (!logout) throw new Error('Failed to find "Log Out"');

	await logout.click();

	const _continue = await page.waitForSelector('text/Continue');

	if (!_continue) throw new Error('Failed to find "Continue"');

	await _continue.click();

	return screenshot;
}
