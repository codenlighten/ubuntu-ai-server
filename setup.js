#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { StructuredResponseGenerator } from './StructuredResponseGenerator.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('profile', {
      alias: 'p',
      type: 'string',
      description: 'Setup profile name (e.g., web-node)',
      demandOption: true,
    })
    .argv;

  const prompt = `Generate a JSON specification for an Ubuntu server setup profile named "${argv.profile}" including the following keys: packages (array of package names to install), services (array of systemd service names to enable/restart), commands (array of shell commands to run), files (array of objects with path and content for configuration files).`;

  const generator = new StructuredResponseGenerator();

  const response = await generator.generateStructuredResponse(prompt, {
    type: 'object',
    properties: {
      packages: { type: 'array', items: { type: 'string' } },
      services: { type: 'array', items: { type: 'string' } },
      commands: { type: 'array', items: { type: 'string' } },
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['path', 'content']
        }
      }
    },
    required: ['packages', 'services', 'commands', 'files']
  });

  // Update and install packages
  console.log('Updating apt cache and installing packages...');
  execSync(`sudo apt-get update && sudo apt-get install -y ${response.packages.join(' ')}`, { stdio: 'inherit' });

  // Execute additional commands
  for (const cmd of response.commands) {
    console.log(`Executing: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
  }

  // Write configuration files
  for (const file of response.files) {
    const fullPath = path.resolve(file.path);
    console.log(`Writing file: ${fullPath}`);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, 'utf8');
  }

  // Enable and restart services
  for (const svc of response.services) {
    console.log(`Enabling and restarting service: ${svc}`);
    execSync(`sudo systemctl enable ${svc}`, { stdio: 'inherit' });
    execSync(`sudo systemctl restart ${svc}`, { stdio: 'inherit' });
  }

  console.log('Automated server setup complete!');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

