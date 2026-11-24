import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';

import { loadGlobalConfig, saveGlobalConfig, setGlobalConfigValue } from '../config/global-config';
import { RIG } from '../meta';
import { ui } from '../ui/output';
import { isInteractive, select } from '../ui/prompt';

export const DEFAULT_BROWSER = 'default';

interface BrowserInfo {
	id: string;
	label: string;
	/** The app name on macOS, for `open -a`. */
	macApp?: string;
	/** Commands on Linux, in order of preference. */
	commands?: string[];
}

export const BROWSERS: readonly BrowserInfo[] = [
	{
		id: 'chrome',
		label: 'Google Chrome',
		macApp: 'Google Chrome',
		commands: ['google-chrome', 'google-chrome-stable'],
	},
	{ id: 'firefox', label: 'Firefox', macApp: 'Firefox', commands: ['firefox'] },
	{ id: 'safari', label: 'Safari', macApp: 'Safari' },
	{ id: 'arc', label: 'Arc', macApp: 'Arc' },
	{ id: 'brave', label: 'Brave', macApp: 'Brave Browser', commands: ['brave-browser', 'brave'] },
	{
		id: 'edge',
		label: 'Microsoft Edge',
		macApp: 'Microsoft Edge',
		commands: ['microsoft-edge', 'microsoft-edge-stable'],
	},
	{
		id: 'chromium',
		label: 'Chromium',
		macApp: 'Chromium',
		commands: ['chromium', 'chromium-browser'],
	},
	{ id: 'vivaldi', label: 'Vivaldi', macApp: 'Vivaldi', commands: ['vivaldi'] },
	{ id: 'opera', label: 'Opera', macApp: 'Opera', commands: ['opera'] },
	{ id: 'zen', label: 'Zen', macApp: 'Zen', commands: ['zen-browser', 'zen'] },
	{ id: 'orion', label: 'Orion', macApp: 'Orion' },
	{ id: 'dia', label: 'Dia', macApp: 'Dia' },
];

/** Directories with macOS apps. `RIG_APPLICATIONS_DIRS` replaces them in tests. */
export function applicationDirs(): string[] {
	const override = process.env.RIG_APPLICATIONS_DIRS;
	if (override) return override.split(':').filter(Boolean);
	return [
		'/Applications',
		join(homedir(), 'Applications'),
		'/System/Applications',
		'/System/Volumes/Preboot/Cryptexes/App/System/Applications',
	];
}

export function hasMacApp(app: string): boolean {
	return applicationDirs().some((dir) => existsSync(join(dir, `${app}.app`)));
}

export function onPath(command: string): boolean {
	const result = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });
	return result.status === 0;
}

/** How to open a URL in one browser. */
interface Launch {
	command: string;
	args: string[];
}

function launchFor(browser: BrowserInfo): Launch | undefined {
	if (process.platform === 'darwin') {
		return browser.macApp && hasMacApp(browser.macApp)
			? { command: 'open', args: ['-a', browser.macApp] }
			: undefined;
	}
	const command = browser.commands?.find(onPath);
	return command ? { command, args: [] } : undefined;
}

/** The browsers installed on this machine. */
export function installedBrowsers(): BrowserInfo[] {
	return BROWSERS.filter((browser) => launchFor(browser) !== undefined);
}

function systemOpener(): Launch {
	return { command: process.platform === 'darwin' ? 'open' : 'xdg-open', args: [] };
}

/** How to open a URL with a configured value: `default`, a known id, or an app name or a command. */
export function browserLaunch(value: string): Launch {
	if (value === DEFAULT_BROWSER) return systemOpener();
	const known = BROWSERS.find((browser) => browser.id === value);
	if (known) return launchFor(known) ?? systemOpener();
	return process.platform === 'darwin'
		? { command: 'open', args: ['-a', value] }
		: { command: value, args: [] };
}

export function browserLabel(value: string): string {
	if (value === DEFAULT_BROWSER) return 'the default browser';
	return BROWSERS.find((browser) => browser.id === value)?.label ?? value;
}

/** Whether the next URL asks for a browser first. */
export function needsBrowserChoice(): boolean {
	return (
		loadGlobalConfig().browser === undefined && isInteractive() && installedBrowsers().length > 1
	);
}

/**
 * The browser for URLs. The first time, rig asks in a terminal which installed
 * browser to use and saves the answer. With one browser or without a terminal,
 * it uses the default browser and does not ask.
 */
export async function chooseBrowser(): Promise<string> {
	const configured = loadGlobalConfig().browser;
	if (configured) return configured;
	if (!needsBrowserChoice()) return DEFAULT_BROWSER;

	const choice = await select<string>('Which browser should rig open URLs in?', [
		{ value: DEFAULT_BROWSER, label: 'System default browser' },
		...installedBrowsers().map((browser) => ({ value: browser.id, label: browser.label })),
	]);
	saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), 'browser', choice));
	ui.success(
		`Saved: rig opens URLs in ${browserLabel(choice)}. ${pc.dim(`Change it with \`${RIG} config set browser <name>\`.`)}`,
	);
	return choice;
}

/** Opens a URL in the configured browser. Asks for the browser the first time. */
export async function openUrl(url: string): Promise<void> {
	const browser = await chooseBrowser();
	const { command, args } = browserLaunch(browser);
	const child = spawn(command, [...args, url], { stdio: 'ignore', detached: true });
	child.on('error', () => ui.warn(`Cannot open ${browserLabel(browser)}. Open ${url} yourself.`));
	child.unref();
}
