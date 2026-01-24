const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { exec } = require('child_process');

const ENV_PATH = path.join(__dirname, '.env');
const DOCKER_COMPOSE_PATH = path.join(__dirname, 'docker-compose.yml');
const FONTS_DIR = path.join(__dirname, 'fonts');

// --- Constants ---
const colors = [
  { name: 'White (#ffffff)', value: '#ffffff' },
  { name: 'Light Gray (#f0f0f0)', value: '#f0f0f0' },
  { name: 'Dark Gray (#333333)', value: '#333333' },
  { name: 'Black (#000000)', value: '#000000' },
  { name: 'Blue (#007bff)', value: '#007bff' },
  { name: 'Millennial Pink (#FFD1DC)', value: '#FFD1DC' },
  { name: 'Gen Z Yellow (#FDFD96)', value: '#FDFD96' },
  { name: 'Lavender (#E6E6FA)', value: '#E6E6FA' },
  { name: 'Mint Green (#98FF98)', value: '#98FF98' },
  { name: 'Coral (#FF7F50)', value: '#FF7F50' },
  { name: 'Teal (#1ABC9C)', value: '#1ABC9C' },
  { name: 'Custom Hex', value: 'custom' }
];

// --- Helpers ---
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

function getFonts() {
  if (!fs.existsSync(FONTS_DIR)) return [];
  return fs.readdirSync(FONTS_DIR).filter(file => {
    return (file.endsWith('.ttf') || file.endsWith('.otf')) && !file.startsWith('._');
  });
}

const generateDockerCompose = (port, useExternalNetwork, networkName, exposeToHost) => {
  let networksConfig = '';
  let portsConfig = '';

  if (useExternalNetwork) {
    networksConfig = `
networks:
  default:
    external: true
    name: ${networkName}
`;
  } else {
    networksConfig = ''; 
  }

  if (exposeToHost) {
    portsConfig = `
    ports:
      - "${port}:${port}"`;
  }

  return `services:
  naas-img:
    build: .
    image: naas-img:latest
    container_name: naas-img
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 256M
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    tmpfs:
      - /tmp
    command: node index.js
    env_file:
      - .env
${portsConfig}
${networksConfig}`;
};

// --- Workflows ---

// 1. Full Setup (The original wizard)
async function fullSetupWorkflow() {
  console.log('\n--- Full Setup ---');
  let currentConfig = {};
  if (fs.existsSync(ENV_PATH)) {
    currentConfig = parseEnv(fs.readFileSync(ENV_PATH, 'utf-8'));
  }
  const fonts = getFonts();

  // Mode
  const modeAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to run the application?',
      choices: [
        { name: 'Docker (Recommended for servers)', value: 'docker' },
        { name: 'Native (Node.js local)', value: 'native' },
        { name: 'Exit', value: 'exit' }
      ]
    }
  ]);

  if (modeAnswer.mode === 'exit') {
    console.log('Exiting setup.');
    return;
  }

  // Features
  const featureAnswer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableImages',
      message: 'Enable Image Generation endpoints (/S, /M, /L)? (Requires more RAM/CPU)',
      default: currentConfig.ENABLE_IMAGES === 'true' || true
    }
  ]);

  // Networking (Docker)
  let dockerNetAnswer = {};
  if (modeAnswer.mode === 'docker') {
    dockerNetAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'netType',
        message: 'Network Configuration:',
        choices: [
          { name: 'Standard (Expose port to LAN/Host)', value: 'standard' },
          { name: 'Internal Only (Use existing Docker network/Tunnel)', value: 'internal' }
        ]
      },
      {
        type: 'input',
        name: 'networkName',
        message: 'Enter external network name (e.g. cloudflared-stack_default):',
        when: (answers) => answers.netType === 'internal',
        default: 'cloudflared-stack_default'
      },
      {
        type: 'confirm',
        name: 'forceExpose',
        message: 'Even with internal network, expose port to host?',
        when: (answers) => answers.netType === 'internal',
        default: false
      }
    ]);
  }

  // App Config
  const appConfigAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'port',
      message: 'Application Port:',
      default: currentConfig.PORT || '3005',
      validate: (input) => !isNaN(parseInt(input)) ? true : 'Port must be a number'
    },
    {
      type: 'list',
      name: 'font',
      message: 'Select Font Family (for images):',
      choices: fonts.map(f => {
        const name = f.replace(/\.(ttf|otf)$/, '').replace(/[_-]/g, ' ');
        const displayName = name.replace(/\b\w/g, c => c.toUpperCase());
        return { name: displayName, value: f };
      }),
      when: () => featureAnswer.enableImages
    },
    {
      type: 'list',
      name: 'bgColorSelect',
      message: 'Background Color:',
      choices: colors,
      default: '#f0f0f0',
      when: () => featureAnswer.enableImages
    },
    {
      type: 'input',
      name: 'bgColorCustom',
      message: 'Enter Background Hex:',
      when: (answers) => answers.bgColorSelect === 'custom',
      validate: (input) => /^#[0-9A-F]{6}$/i.test(input) ? true : 'Invalid Hex Color'
    },
    {
      type: 'list',
      name: 'textColorSelect',
      message: 'Text Color:',
      choices: colors,
      default: '#333333',
      when: () => featureAnswer.enableImages
    },
    {
      type: 'input',
      name: 'textColorCustom',
      message: 'Enter Text Hex:',
      when: (answers) => answers.textColorSelect === 'custom',
      validate: (input) => /^#[0-9A-F]{6}$/i.test(input) ? true : 'Invalid Hex Color'
    }
  ]);

  // Process & Save
  let finalFontFamily = 'sans-serif';
  if (featureAnswer.enableImages && appConfigAnswers.font) {
    const finalFontFile = appConfigAnswers.font;
    finalFontFamily = finalFontFile
      .replace(/\.(ttf|otf)$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  const finalBg = appConfigAnswers.bgColorSelect === 'custom' ? appConfigAnswers.bgColorCustom : (appConfigAnswers.bgColorSelect || '#f0f0f0');
  const finalText = appConfigAnswers.textColorSelect === 'custom' ? appConfigAnswers.textColorCustom : (appConfigAnswers.textColorSelect || '#333333');

  const envContent = [
    `PORT=${appConfigAnswers.port}`,
    `ENABLE_IMAGES=${featureAnswer.enableImages}`,
    `DEPLOY_MODE=${modeAnswer.mode}`, // Save mode for future checks
    '',
    '# Image Generator Configuration',
    `IMG_BG_COLOR=${finalBg}`,
    `IMG_TEXT_COLOR=${finalText}`,
    `IMG_FONT_FAMILY="${finalFontFamily}"`
  ].join('\n');

  fs.writeFileSync(ENV_PATH, envContent);
  console.log('\n✅ Configuration saved to .env');

  // Docker Compose
  if (modeAnswer.mode === 'docker') {
    const useExternal = dockerNetAnswer.netType === 'internal';
    const expose = dockerNetAnswer.netType === 'standard' || dockerNetAnswer.forceExpose;
    const composeContent = generateDockerCompose(appConfigAnswers.port, useExternal, dockerNetAnswer.networkName, expose);
    fs.writeFileSync(DOCKER_COMPOSE_PATH, composeContent);
    console.log('✅ Generated docker-compose.yml.');

    const deployAnswer = await inquirer.prompt([{ type: 'confirm', name: 'redeploy', message: 'Deploy Docker container now?', default: true }]);
    if (deployAnswer.redeploy) {
      deployDocker();
    }
  } else {
    // Native
    const startNativeAnswer = await inquirer.prompt([{ type: 'confirm', name: 'startNow', message: 'Start server in background now? (Uses "forever")', default: true }]);
    if (startNativeAnswer.startNow) {
      startNative();
    }
  }
}

// 2. Simplified Update
async function updateConfigWorkflow(currentConfig) {
  console.log('\n--- Update Configuration ---');
  const fonts = getFonts();
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'updateTarget',
      message: 'What would you like to update?',
      choices: [
        { name: 'Colors & Fonts', value: 'visuals' },
        { name: 'Application Port', value: 'port' },
        { name: 'Toggle Image Features', value: 'features' },
        { name: 'Back to Main Menu', value: 'back' }
      ]
    }
  ]);

  if (answers.updateTarget === 'back') return run();

  let newConfig = { ...currentConfig };

  if (answers.updateTarget === 'visuals') {
    const vizAnswers = await inquirer.prompt([
       {
        type: 'list',
        name: 'font',
        message: 'Select Font Family:',
        choices: fonts.map(f => ({ name: f.replace(/\.(ttf|otf)$/, ''), value: f })),
      },
      { type: 'list', name: 'bgColorSelect', message: 'Background Color:', choices: colors, default: currentConfig.IMG_BG_COLOR },
      { type: 'input', name: 'bgColorCustom', message: 'Hex:', when: (a) => a.bgColorSelect === 'custom', validate: i => /^#[0-9A-F]{6}$/i.test(i) || 'Invalid' },
      { type: 'list', name: 'textColorSelect', message: 'Text Color:', choices: colors, default: currentConfig.IMG_TEXT_COLOR },
      { type: 'input', name: 'textColorCustom', message: 'Hex:', when: (a) => a.textColorSelect === 'custom', validate: i => /^#[0-9A-F]{6}$/i.test(i) || 'Invalid' }
    ]);
    
    // Process Font
    if (vizAnswers.font) {
       newConfig.IMG_FONT_FAMILY = vizAnswers.font.replace(/\.(ttf|otf)$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    // Process Colors
    newConfig.IMG_BG_COLOR = vizAnswers.bgColorSelect === 'custom' ? vizAnswers.bgColorCustom : vizAnswers.bgColorSelect;
    newConfig.IMG_TEXT_COLOR = vizAnswers.textColorSelect === 'custom' ? vizAnswers.textColorCustom : vizAnswers.textColorSelect;
  
  } else if (answers.updateTarget === 'port') {
    const p = await inquirer.prompt([{ type: 'input', name: 'port', message: 'New Port:', default: currentConfig.PORT, validate: i => !isNaN(parseInt(i)) || 'Number req.' }]);
    newConfig.PORT = p.port;
  
  } else if (answers.updateTarget === 'features') {
    const f = await inquirer.prompt([{ type: 'confirm', name: 'enableImages', message: 'Enable Image Generation?', default: currentConfig.ENABLE_IMAGES === 'true' }]);
    newConfig.ENABLE_IMAGES = f.enableImages;
  }

  // Save .env
  const envLines = Object.entries(newConfig).map(([k, v]) => {
    // Quote string values like font family if needed, though simple env parsing handles it differently.
    // We'll just write simple key=value. For font family with spaces, quotes are safer.
    if (k === 'IMG_FONT_FAMILY' && !v.startsWith('"')) return `${k}="${v}"`;
    return `${k}=${v}`;
  }).join('\n');
  fs.writeFileSync(ENV_PATH, envLines);
  console.log('✅ Configuration updated.');

  // Apply Changes
  await applyChanges(currentConfig);
}

// 3. Service Management
async function manageServiceWorkflow(currentConfig) {
  const mode = currentConfig.DEPLOY_MODE || 'unknown';
  console.log(`\n--- Manage Service (Mode: ${mode}) ---`);

  if (mode === 'docker') {
    const answer = await inquirer.prompt([{ type: 'list', name: 'action', message: 'Action:', choices: ['Redeploy (Rebuild & Restart)', 'Stop Container', 'View Logs', 'Back'] }]);
    if (answer.action.startsWith('Redeploy')) deployDocker();
    else if (answer.action.startsWith('Stop')) exec('docker compose down', stdCallback);
    else if (answer.action.startsWith('View')) exec('docker compose logs --tail=50', stdCallback);
    else run();
  } else if (mode === 'native') {
    const answer = await inquirer.prompt([{ type: 'list', name: 'action', message: 'Action:', choices: ['Start/Restart (Background)', 'Stop Server', 'List Processes', 'Back'] }]);
    if (answer.action.startsWith('Start')) startNative();
    else if (answer.action.startsWith('Stop')) exec('npx forever stop index.js', stdCallback);
    else if (answer.action.startsWith('List')) exec('npx forever list', stdCallback);
    else run();
  } else {
    console.log('Unknown deployment mode. Please reconfigure from scratch.');
    run();
  }
}

// --- Actions ---
function deployDocker() {
  console.log('🔄 Redeploying Docker...');
  exec('docker compose down && docker compose up -d --build', stdCallback);
}

function startNative() {
  console.log('🚀 Starting Native Server...');
  exec('npx forever start index.js', stdCallback);
}

async function applyChanges(config) {
  const mode = config.DEPLOY_MODE;
  const answer = await inquirer.prompt([{ type: 'confirm', name: 'apply', message: `Restart ${mode} service to apply changes?`, default: true }]);
  if (answer.apply) {
    if (mode === 'docker') deployDocker();
    else if (mode === 'native') exec('npx forever restart index.js', stdCallback);
  } else {
    run();
  }
}

function stdCallback(error, stdout, stderr) {
  if (error) console.error(`❌ Error: ${error.message}`);
  if (stderr) console.log(stderr);
  if (stdout) console.log(stdout);
}

// --- Main Entry ---
async function run() {
  console.log('\n🔧 No-as-a-Service Manager\n');

  if (fs.existsSync(ENV_PATH)) {
    const currentConfig = parseEnv(fs.readFileSync(ENV_PATH, 'utf-8'));
    
    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Existing configuration found. Select an option:',
        choices: [
          { name: 'Update Configuration (Quick)', value: 'update' },
          { name: 'Manage Service (Restart/Logs)', value: 'manage' },
          { name: 'Reconfigure from Scratch (Full Reset)', value: 'reset' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (action.choice === 'update') await updateConfigWorkflow(currentConfig);
    else if (action.choice === 'manage') await manageServiceWorkflow(currentConfig);
    else if (action.choice === 'reset') await fullSetupWorkflow();
    else process.exit(0);

  } else {
    await fullSetupWorkflow();
  }
}

run();
