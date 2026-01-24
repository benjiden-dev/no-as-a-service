const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { exec } = require('child_process');

const ENV_PATH = path.join(__dirname, '.env');
const FONTS_DIR = path.join(__dirname, 'fonts');

// Helper to parse .env manually
function parseEnv(content) {
  const config = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      config[match[1].trim()] = match[2].trim();
    }
  });
  return config;
}

// Get current config
let currentConfig = {};
if (fs.existsSync(ENV_PATH)) {
  currentConfig = parseEnv(fs.readFileSync(ENV_PATH, 'utf-8'));
}

// Get Fonts
let fonts = [];
if (fs.existsSync(FONTS_DIR)) {
  fonts = fs.readdirSync(FONTS_DIR).filter(file => {
    return (file.endsWith('.ttf') || file.endsWith('.otf')) && !file.startsWith('._');
  });
}

if (fonts.length === 0) {
  console.warn('No fonts found in ./fonts directory.');
}

// Common Colors
const colors = [
  { name: 'White (#ffffff)', value: '#ffffff' },
  { name: 'Light Gray (#f0f0f0)', value: '#f0f0f0' },
  { name: 'Dark Gray (#333333)', value: '#333333' },
  { name: 'Black (#000000)', value: '#000000' },
  { name: 'Blue (#007bff)', value: '#007bff' },
  { name: 'Custom Hex', value: 'custom' }
];

async function run() {
  console.log('Welcome to the No-as-a-Service Configuration Tool!\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'font',
      message: 'Select a Font Family:',
      choices: fonts.map(f => {
        const name = f.replace(/\.(ttf|otf)$/, '').replace(/[_-]/g, ' ');
        const displayName = name.replace(/\b\w/g, c => c.toUpperCase());
        return { name: displayName, value: f };
      }),
      default: () => {
         // Default logic could be improved
      }
    },
    {
      type: 'list',
      name: 'bgColorSelect',
      message: 'Select Background Color:',
      choices: colors,
      default: '#f0f0f0'
    },
    {
      type: 'input',
      name: 'bgColorCustom',
      message: 'Enter Background Hex (e.g. #123456):',
      when: (answers) => answers.bgColorSelect === 'custom',
      validate: (input) => /^#[0-9A-F]{6}$/i.test(input) ? true : 'Invalid Hex Color'
    },
    {
      type: 'list',
      name: 'textColorSelect',
      message: 'Select Text Color:',
      choices: colors,
      default: '#333333'
    },
    {
      type: 'input',
      name: 'textColorCustom',
      message: 'Enter Text Hex (e.g. #123456):',
      when: (answers) => answers.textColorSelect === 'custom',
      validate: (input) => /^#[0-9A-F]{6}$/i.test(input) ? true : 'Invalid Hex Color'
    },
    {
      type: 'input',
      name: 'port',
      message: 'Port:',
      default: currentConfig.PORT || '3000',
      validate: (input) => !isNaN(parseInt(input)) ? true : 'Port must be a number'
    }
  ]);

  const finalFontFile = answers.font;
  const finalFontFamily = finalFontFile
    .replace(/\.(ttf|otf)$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const lines = [
    `PORT=${answers.port}`,
    '',
    '# Image Generator Configuration',
    '# Configured via configure.js',
    '',
    `# Background color`,
    `IMG_BG_COLOR=${answers.bgColorSelect === 'custom' ? answers.bgColorCustom : answers.bgColorSelect}`,
    '',
    `# Text color`,
    `IMG_TEXT_COLOR=${answers.textColorSelect === 'custom' ? answers.textColorCustom : answers.textColorSelect}`,
    '',
    `# Font family`,
    `# Linked file: ${finalFontFile}`,
    `IMG_FONT_FAMILY="${finalFontFamily}"`
  ];

  fs.writeFileSync(ENV_PATH, lines.join('\n'));
  console.log('\nConfiguration saved to .env!');
  console.log(`\nNOTE: Ensure your application registers the font "${finalFontFamily}" from file "${finalFontFile}".`);

  // Redeploy Prompt
  const deployAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'redeploy',
      message: 'Redeploy Docker container with new config?',
      default: true
    }
  ]);

  if (deployAnswer.redeploy) {
    console.log('Redeploying... (This may take a moment)');
    // Run down first to ensure clean state and remove old containers
    const cmd = 'docker compose down && docker compose up -d --build';
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error redeploying: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`Docker Output:\n${stderr}`);
      }
      if (stdout) {
        console.log(stdout);
      }
      console.log('Redeploy complete!');
    });
  } else {
    console.log('Skipping redeploy. Remember to restart your container to apply changes.');
  }
}

run();
