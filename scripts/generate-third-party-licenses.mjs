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

// Disable verbose output for cleaner logs
$.verbose = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

echo(chalk.blue('Generating third-party licenses for n8n...'));

// Step 1: Generate JSON using license-checker
echo(chalk.yellow('Step 1: Running license-checker...'));

const licensesJsonPath = path.join(rootDir, 'licenses.json');
const customFormatPath = path.join(__dirname, 'third-party-license-format.json');

try {
  await $`license-checker --json --customPath ${customFormatPath}`.pipe(fs.createWriteStream(licensesJsonPath));
} catch (error) {
  echo(chalk.red('Error: Failed to run license-checker'));
  process.exit(1);
}

// Step 2: Parse JSON and generate markdown
echo(chalk.yellow('Step 2: Parsing licenses and generating markdown...'));

let licensesData;
try {
  licensesData = await fs.readFile(licensesJsonPath, 'utf-8');
} catch (error) {
  echo(chalk.red('Error: Could not read licenses.json'));
  process.exit(1);
}

let packages;
try {
  packages = JSON.parse(licensesData);
} catch (error) {
  echo(chalk.red('Error: Could not parse licenses.json'));
  process.exit(1);
}

// Header content
const header = `# Third-Party Licenses

This file lists third-party software components included in n8n and their respective license terms.

The n8n software includes open source packages, libraries, and modules, each of which is subject to its own license. The following sections list those dependencies and provide required attributions and license texts.

---
`;

let content = header;

// Sort packages by name for consistent output
const sortedPackageKeys = Object.keys(packages).sort();

echo(chalk.cyan(`Processing ${sortedPackageKeys.length} packages...`));

for (const packageKey of sortedPackageKeys) {
  const pkg = packages[packageKey];

  // Extract package name and version from the key (format: "package@version")
  const atIndex = packageKey.lastIndexOf('@');
  const packageName = packageKey.substring(0, atIndex);
  const version = packageKey.substring(atIndex + 1);

  // Skip n8n packages
  if (packageName.includes('n8n')) {
    continue;
  }

  content += `## Package: \`${packageName}\`

- Version: ${version}
- License: ${pkg.licenses || 'Unknown'}`;

  // Add homepage if available
  if (pkg.repository) {
    content += `\n- Homepage: <${pkg.repository}>`;
  }

  content += '\n- License Text:\n';

  // Add license text 
  if (pkg.licenseText && pkg.licenseText.trim()) {
    // Clean up the license text
    const cleanLicenseText = pkg.licenseText
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\r\n/g, '\n')
      .trim();

    const lines = cleanLicenseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let truncatedText = '';

    // Add license type
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

    // Find permission line or fallback to meaningful content
    const permissionLine = lines.find(line =>
      line.toLowerCase().includes('permission is hereby granted')
    );

    if (permissionLine) {
      // Truncate permission line at a reasonable point
      let truncated = permissionLine;
      if (truncated.length > 80) {
        const words = truncated.split(' ');
        truncated = words.slice(0, 12).join(' ');
      }
      truncatedText += `${truncated}...`;
    } else if (copyrightLine) {
      // If we have copyright but no permission line, just end with copyright
      truncatedText = truncatedText.replace(/\n\n$/, '...');
    } else {
      truncatedText += '...';
    }

    content += truncatedText;
  } else {
    content += `${pkg.licenses || 'Unknown'} License\n\nLicense text not available.`;
  }

  content += '\n\n---\n\n';
}

// Remove the last separator
content = content.replace(/---\n\n$/, '');

// Step 3: Write to file
const outputPath = path.join(rootDir, 'THIRD_PARTY_LICENSES.md');
await fs.writeFile(outputPath, content);

// Clean up temporary file
await fs.remove(licensesJsonPath);

echo(chalk.green(`✅ Third-party licenses generated successfully: ${outputPath}`));
echo(chalk.green(`📦 Total packages processed: ${sortedPackageKeys.length}`));
