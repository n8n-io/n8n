#!/usr/bin/env node
/**
 * This script generates THIRD_PARTY_LICENSES.md using license-checker.
 *
 * It will:
 * 1. Run license-checker to generate a JSON output of all dependencies
 * 2. Parse the JSON data and format it as a markdown file
 * 3. Generate THIRD_PARTY_LICENSES.md in the required format
 *
 * Usage: node scripts/generate-third-party-licenses.mjs
 */

import { $, echo, fs, chalk, path } from 'zx';
import { fileURLToPath } from 'url';

// Constants
const LICENSE_TRUNCATION_LENGTH = 80;
const PERMISSION_WORD_LIMIT = 12;
const TEMP_LICENSE_FILE = 'licenses.json';
const OUTPUT_FILE = 'THIRD_PARTY_LICENSES.md';
const FORMAT_FILE = 'third-party-license-format.json';

// Disable verbose output for cleaner logs
$.verbose = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Runs license-checker and saves output to temporary JSON file
 */
async function generateLicenseData() {
  echo(chalk.yellow('Step 1: Running license-checker...'));
  
  const licensesJsonPath = path.join(rootDir, TEMP_LICENSE_FILE);
  const customFormatPath = path.join(__dirname, FORMAT_FILE);

  try {
    await $`license-checker --json --customPath ${customFormatPath}`.pipe(fs.createWriteStream(licensesJsonPath));
    return licensesJsonPath;
  } catch (error) {
    echo(chalk.red('Error: Failed to run license-checker'));
    process.exit(1);
  }
}

/**
 * Reads and parses license data from JSON file
 */
async function readLicenseData(licensesJsonPath) {
  try {
    const licensesData = await fs.readFile(licensesJsonPath, 'utf-8');
    return JSON.parse(licensesData);
  } catch (error) {
    echo(chalk.red('Error: Could not read or parse licenses.json'));
    process.exit(1);
  }
}

/**
 * Extracts package name and version from license-checker key format
 */
function parsePackageKey(packageKey) {
  const atIndex = packageKey.lastIndexOf('@');
  const packageName = packageKey.substring(0, atIndex);
  const version = packageKey.substring(atIndex + 1);
  return { packageName, version };
}

/**
 * Processes license text to create a truncated summary
 */
function formatLicenseText(pkg) {
  if (!pkg.licenseText || !pkg.licenseText.trim()) {
    return `${pkg.licenses || 'Unknown'} License\n\nLicense text not available.`;
  }

  const cleanLicenseText = pkg.licenseText
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\r\n/g, '\n')
    .trim();

  const lines = cleanLicenseText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let truncatedText = '';

  // Add license type header
  if (pkg.licenses) {
    truncatedText += `${pkg.licenses} License\n\n`;
  }

  // Find and add copyright line
  const copyrightLine = lines.find(line =>
    line.toLowerCase().includes('copyright') &&
    !line.toLowerCase().includes('permission') &&
    !line.toLowerCase().includes('license')
  );
  
  if (copyrightLine) {
    truncatedText += `${copyrightLine}\n\n`;
  }

  // Find permission line and truncate if needed
  const permissionLine = lines.find(line =>
    line.toLowerCase().includes('permission is hereby granted')
  );

  if (permissionLine) {
    let truncated = permissionLine;
    if (truncated.length > LICENSE_TRUNCATION_LENGTH) {
      const words = truncated.split(' ');
      truncated = words.slice(0, PERMISSION_WORD_LIMIT).join(' ');
    }
    truncatedText += `${truncated}...`;
  } else if (copyrightLine) {
    truncatedText = truncatedText.replace(/\n\n$/, '...');
  } else {
    truncatedText += '...';
  }

  return truncatedText;
}

/**
 * Generates markdown content for a single package
 */
function generatePackageMarkdown(packageKey, pkg) {
  const { packageName, version } = parsePackageKey(packageKey);

  // Skip n8n packages
  if (packageName.includes('n8n')) {
    return '';
  }

  let content = `## Package: \`${packageName}\`

- Version: ${version}
- License: ${pkg.licenses || 'Unknown'}`;

  // Add homepage if available
  if (pkg.repository) {
    content += `\n- Homepage: <${pkg.repository}>`;
  }

  content += '\n- License Text:\n';
  content += formatLicenseText(pkg);
  content += '\n\n---\n\n';

  return content;
}

/**
 * Generates the complete markdown content
 */
function generateMarkdownContent(packages) {
  const header = `# Third-Party Licenses

This file lists third-party software components included in n8n and their respective license terms.

The n8n software includes open source packages, libraries, and modules, each of which is subject to its own license. The following sections list those dependencies and provide required attributions and license texts.

---
`;

  const sortedPackageKeys = Object.keys(packages).sort();
  echo(chalk.cyan(`Processing ${sortedPackageKeys.length} packages...`));

  let content = header;
  let processedCount = 0;

  for (const packageKey of sortedPackageKeys) {
    const packageContent = generatePackageMarkdown(packageKey, packages[packageKey]);
    if (packageContent) {
      content += packageContent;
      processedCount++;
    }
  }

  // Remove the last separator
  content = content.replace(/---\n\n$/, '');
  
  return { content, processedCount };
}

/**
 * Main execution function
 */
async function main() {
  echo(chalk.blue('Generating third-party licenses for n8n...'));

  try {
    // Step 1: Generate license data
    const licensesJsonPath = await generateLicenseData();

    // Step 2: Read and parse data
    echo(chalk.yellow('Step 2: Parsing licenses and generating markdown...'));
    const packages = await readLicenseData(licensesJsonPath);

    // Step 3: Generate markdown content
    const { content, processedCount } = generateMarkdownContent(packages);

    // Step 4: Write to file
    const outputPath = path.join(rootDir, OUTPUT_FILE);
    await fs.writeFile(outputPath, content);

    // Step 5: Clean up temporary file
    await fs.remove(licensesJsonPath);

    // Success messages
    echo(chalk.green(`✅ Third-party licenses generated successfully: ${outputPath}`));
    echo(chalk.green(`📦 Total packages processed: ${processedCount}`));

  } catch (error) {
    echo(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Run the script
main();
