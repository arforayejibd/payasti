const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, 'scratch', 'prod_staging');

if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

const copyList = [
    'controllers',
    'models',
    'routes',
    'views',
    'utils',
    'services',
    'config',
    'public',
    'server.js',
    'package.json',
    'package-lock.json'
];

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else if (exists) {
        fs.copyFileSync(src, dest);
    }
}

for (const item of copyList) {
    const src = path.join(rootDir, item);
    const dest = path.join(stagingDir, item);
    if (fs.existsSync(src)) {
        console.log(`Copying ${item}...`);
        copyRecursiveSync(src, dest);
    }
}

// Copy production .env
const envContent = `# Production Environment
PORT=3000
NODE_ENV=production

# Security Secrets
SESSION_SECRET=payasti-session-key-2026
JWT_SECRET=payasti-super-secret-jwt-key-2026

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=ecstolin_nodeuser
DB_PASSWORD=nG(xcxtu(b2[o5#1
DB_NAME=ecstolin_node
DB_PORT=3306

# Live Domain
SITE_URL=https://sera10.com
`;

fs.writeFileSync(path.join(stagingDir, '.env'), envContent);
console.log('Written production .env');

const zipFile = path.join(rootDir, 'scratch', 'sera10_prod.zip');
if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
}

console.log('Compressing with PowerShell...');
execSync(`powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });

const stats = fs.statSync(zipFile);
console.log(`Successfully created ${zipFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
