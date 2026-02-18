/**
 * AI-Protocol 构建脚本：将 v1/v2/v2-alpha 下的 YAML 转为 dist/ 中的 JSON。
 */
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, existsSync, rmSync } from 'fs';
import { join, dirname, resolve, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = join(ROOT_DIR, 'dist');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
};

function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

function convertFile(srcPath, destPath) {
    try {
        const content = readFileSync(srcPath, 'utf-8');
        const data = yaml.load(content);

        // Remove $schema if present (optional, but clean for runtime)
        // if (data.$schema) delete data.$schema;

        writeFileSync(destPath, JSON.stringify(data, null, 2));
        // console.log(`${colors.green}鉁?Converted:${colors.reset} ${relative(ROOT_DIR, srcPath)} -> ${relative(ROOT_DIR, destPath)}`);
        return true;
    } catch (error) {
        console.error(`${colors.red}鉂?Failed to convert ${srcPath}:${colors.reset} ${error.message}`);
        return false;
    }
}

function processDirectory(srcDir, destDir) {
    ensureDir(destDir);
    const entries = readdirSync(srcDir);
    let count = 0;

    for (const entry of entries) {
        const srcPath = join(srcDir, entry);
        const destPath = join(destDir, entry);
        const stats = statSync(srcPath);

        if (stats.isDirectory()) {
            count += processDirectory(srcPath, destPath);
        } else if (stats.isFile()) {
            const ext = extname(entry).toLowerCase();
            if (ext === '.yaml' || ext === '.yml') {
                const jsonPath = destPath.replace(ext, '.json');
                if (convertFile(srcPath, jsonPath)) {
                    count++;
                }
            }
        }
    }
    return count;
}

function createIndex(distDir) {
    const index = {
        versions: ['v1'],
        latest: 'v1'
    };

    if (existsSync(join(distDir, 'v2'))) {
        index.versions.push('v2');
        index.latest = 'v2';
    }
    if (existsSync(join(distDir, 'v2-alpha'))) {
        index.versions.push('v2-alpha');
    }

    writeFileSync(join(distDir, 'index.json'), JSON.stringify(index, null, 2));
    console.log(`${colors.green}鉁?Created index.json${colors.reset}`);
}

/**
 * Clean the dist directory to remove stale files from previous builds.
 * This ensures that deleted source YAML files don't leave orphaned JSON files.
 */
function cleanDist() {
    if (existsSync(DIST_DIR)) {
        console.log(`${colors.yellow}🧹 Cleaning dist directory...${colors.reset}`);
        rmSync(DIST_DIR, { recursive: true, force: true });
    }
}

function main() {
    console.log(`${colors.blue}📦 Starting Build: YAML -> JSON${colors.reset}`);

    // Clean dist directory before building to remove stale files
    cleanDist();
    ensureDir(DIST_DIR);

    const targets = ['v1', 'v2', 'v2-alpha'];
    let totalFiles = 0;

    targets.forEach(target => {
        const srcDir = join(ROOT_DIR, target);
        if (existsSync(srcDir)) {
            console.log(`Processing ${target}...`);
            const destDir = join(DIST_DIR, target);
            totalFiles += processDirectory(srcDir, destDir);
        }
    });

    createIndex(DIST_DIR);

    console.log(`${colors.green}馃帀 Build Complete! Converted ${totalFiles} files.${colors.reset}`);
}

main();
