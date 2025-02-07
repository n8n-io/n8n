import { join } from 'path';
require('dotenv').config({ path: join(__dirname, '../../.n8n/.env') });

// Debug: print DB configuration from environment
console.log('DB settings:', {
    DB_TYPE: process.env.DB_TYPE,
    DB_HOST: process.env.DB_POSTGRESDB_HOST,
    DB_PORT: process.env.DB_POSTGRESDB_PORT,
    DB_DATABASE: process.env.DB_POSTGRESDB_DATABASE,
    DB_USER: process.env.DB_POSTGRESDB_USER,
    DB_PASSWORD: process.env.DB_POSTGRESDB_PASSWORD,
});

// Debug: check loaded DB user
console.log('Loaded DB user:', process.env.DB_POSTGRESDB_USER);

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { mkdir, rm } from 'fs/promises';
import { join as joinPath } from 'path';

class NodeInstaller {
  private readonly execAsync = promisify(exec);
  private readonly tempDir = joinPath(process.cwd(), 'temp_n8n_nodes');
  private readonly maxConcurrent = 5; // Increased concurrent installations

  async install(): Promise<void> {
    try {
      await mkdir(this.tempDir, { recursive: true });
      
      console.log('🔍 Searching for n8n-nodes packages...');
      const packages = await this.searchPackages();
      
      if (packages.length === 0) {
        console.log('❌ No packages found to install');
        return;
      }

      console.log(`📦 Installing ${packages.length} packages...`);
      
      // Install all packages with a single command
      const packageList = packages.join(' ');
      try {
        console.log('⏳ Installing all packages, this may take a while...');
        await this.execAsync(`npm install ${packageList} --prefix ${this.tempDir}`);
        console.log('✅ Successfully installed all community nodes!');
      } catch (error) {
        console.error('❌ Bulk installation failed, falling back to individual installs');
        
        // Fallback to individual installations if bulk install fails
        let completed = 0;
        const chunks = this.chunkArray(packages, this.maxConcurrent);
        
        for (const chunk of chunks) {
          await Promise.all(chunk.map(async pkg => {
            try {
              await this.execAsync(`npm install ${pkg} --prefix ${this.tempDir}`);
              completed++;
              console.log(`✅ [${completed}/${packages.length}] Installed ${pkg}`);
            } catch (error) {
              console.error(`❌ Failed to install ${pkg}`);
            }
          }));
        }
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      await rm(this.tempDir, { recursive: true, force: true });
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async searchPackages(): Promise<string[]> {
    try {
      const response = await axios.get('https://super-duper-train-q74xrqrwwgrgf6694-5678.app.github.dev/settings/community-nodes', {
        timeout: 10000
      });

      // Extract package names from the HTML response
      const html = response.data;
      const packageMatches = html.match(/n8n-nodes-[a-zA-Z0-9-]+/g);
      
      if (!packageMatches) {
        throw new Error('No community nodes found on the page');
      }

      // Remove duplicates and return unique package names
      return Array.from(new Set(packageMatches));
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      return [];
    }
  }
}

new NodeInstaller().install().catch(console.error);