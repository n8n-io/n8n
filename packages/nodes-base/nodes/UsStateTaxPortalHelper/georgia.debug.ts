import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';

const GEORGIA_LOGIN_URL = 'https://gtc.dor.ga.gov/_/';

puppeteer.use(pluginStealth());

const nextSelector =
	'.ActionButton.ActionButtonNext.ActionButtonPosStep.ActionButtonStepNext.FastEvtExecuteAction';

export async function georgiaLogin() {
	const browser = await puppeteer.launch({ headless: false });

	const page = await browser.newPage();

	await page.setRequestInterception(true);
	page.on('request', async (request) => {
		// Block All Images
		if (request.url().endsWith('.png') || request.url().endsWith('.jpg')) {
			await request.abort();
		} else {
			await request.continue();
		}
	});

	await page.goto(GEORGIA_LOGIN_URL);

	await page.deleteCookie(...(await page.cookies()));

	await page.waitForTimeout(2000);

	try {
		const ok = await page.waitForSelector('.FastMessageBoxButtonOk');

		await ok?.click();
	} catch {}

	await page.waitForTimeout(2000);

	const signup = await page.waitForSelector('.FGNVT.FGNVL.DFL.FastEvt');

	if (!signup) throw new Error('Failed to find "Sign Up"');

	await signup.click();

	await page.waitForTimeout(2000);

	const next = await page.waitForSelector(nextSelector);

	if (!next) throw new Error('Failed to find "Sign Up"');

	await next.click();

	const accountType = await page.waitForSelector('.FastSelect');

	if (!accountType) throw new Error('Failed to find "accountType"');

	await accountType.click();

	await page.select('.DocControlCombobox', 'SLS'); // @TODO becomes deselected for some reason

	await page.waitForTimeout(2000);

	return page.screenshot({ path: './example.png' });

	// ------------------

	// await page.waitForTimeout(2000);

	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Enter');

	// await page.waitForTimeout(2000);

	// const next2 = await page.waitForSelector(nextSelector);

	// if (!next2) throw new Error('Failed to find "Sign Up"');

	// await next2.click();

	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Tab');
	// await page.keyboard.press('Enter');

	// await page.waitForTimeout(2000);

	// const salesTaxNumber = await page.waitForSelector('.DFI');

	// if (!salesTaxNumber) throw new Error('Failed to find "salesTaxNumber"');

	// await salesTaxNumber.type('123456789');

	// const next3 = await page.waitForSelector(nextSelector);

	// if (!next3) throw new Error('Failed to find "Sign Up"');

	// await next3.click();

	// await page.screenshot({ path: './example.png' });
}

// void georgiaLogin();
