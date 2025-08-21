import path from 'node:path';
import * as fs from 'node:fs';
import { createInterface } from 'node:readline';
import { marked } from 'marked';

const CONTENT_DIR = 'content', OUTPUT_DIR = 'public';
const EXTRA_COPIES = ['favicon.png'];
const HTML_EXTENSIONS = ['.html', '.md'];
const COPY_EXTENSIONS = ['.jpg', '.png'];
const DEFAULT_METADATA = {
    folder: {
        type: 'folder',
        icon: 'folder',
        style: 'medium'
    },
    html: {
        type: 'html',
        icon: 'text',
        style: 'large'
    },
    iframe: {
        type: 'iframe',
        icon: 'exe',
        style: 'large'
    },
};

// Parse matadata in a file into a dict of key-values.
// filePath: Absolute path to the file
async function parseMetadata(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    const isHtml = HTML_EXTENSIONS.includes(path.extname(filePath));
    const stream = fs.createReadStream(filePath);
    const rl = createInterface({ input: stream });
    let result = {};

    for await (let line of rl) {
        line = line.trim();
        // Strip HTML comments
        if (isHtml) {
            const matches = line.match(/^<!--(.+)-->$/);
            if (matches == null) {
                break;
            }
            line = matches[1].trim();
        }

        // Extract key and values as groups
        const matches = line.match(/^\s*(\w+)\s*:\s*([^:]+)\s*$/);
        if (matches == null) {
            break;
        }
        const key = matches[1].trim();
        const values = matches[2].trim();
        if (values.includes(',')) {
            result[key] = values.split(',').map(x => x.trim());
        } else {
            result[key] = values;
        }
    }
    return result;
}

// Process directory recursively
// currPath: Relative path to current directory
// currNode: Node in output object
// extra: Node for global information (link, startup etc.)
async function processDirectory(currPath, currNode, extra) {
    const inputPath = path.resolve(CONTENT_DIR, currPath);
    const outputPath = path.resolve(OUTPUT_DIR, currPath);

    // Process all files recursively
    for (const dirent of fs.readdirSync(inputPath, { withFileTypes: true })) {
        const base = dirent.name;
        const ext = path.extname(base);
        const name = path.basename(base, ext);
        const direntPath = path.resolve(inputPath, base);
        const relativePath = path.relative(path.resolve(CONTENT_DIR), direntPath);

        if (dirent.isDirectory()) {
            if (fs.existsSync(path.resolve(direntPath, 'index.html'))) {
                // Standalone app -- do not traverse into subfolders
                console.log(`Iframe: ${relativePath}`);

                currNode[name] = {
                    name: name,
                    path: `/${relativePath}`,
                    ...DEFAULT_METADATA.iframe,
                    ...await parseMetadata(path.resolve(direntPath, 'index.html')),
                }
                fs.cpSync(direntPath, path.resolve(outputPath, base), { recursive: true });
            } else {
                // Subdirectory
                console.log(`Folder: ${relativePath}`);

                currNode[name] = {
                    name: name,
                    path: `/${relativePath}`,
                    contents: {},
                    ...DEFAULT_METADATA.folder,
                    ...await parseMetadata(path.resolve(direntPath, 'metadata')),
                }
                fs.mkdirSync(path.resolve(outputPath, base));
                await processDirectory(relativePath, currNode[name].contents);
            }
        } else if (HTML_EXTENSIONS.includes(ext)) {
            // Single file
            console.log(`Html: ${relativePath}`);

            currNode[name] = {
                name: name,
                path: `/${path.format({ ...path.parse(relativePath), base: null, ext: 'html' })}`,
                ...DEFAULT_METADATA.html,
                ...await parseMetadata(direntPath),
            }

            // Parse markdown if needed
            if (ext == '.md') {
                const input = fs.readFileSync(direntPath, { encoding: "utf8" });
                fs.writeFileSync(path.resolve(outputPath, `${name}.html`), marked.parse(input));
            } else {
                fs.copyFileSync(direntPath, path.resolve(outputPath, base));
            }
        } else if (COPY_EXTENSIONS.includes(ext)) {
            console.log(`Copy: ${relativePath}`);
            fs.copyFileSync(direntPath, path.resolve(outputPath, base));
        }

        // Add link and startup
        if (currNode[name] && currNode[name].link) {
            console.log(`Link: ${currNode[name].path}`);
            extra.link[currNode[name].link] = currNode[name].path.split('.')[0];
        }
        if (currNode[name] && currNode[name].startup) {
            console.log(`Startup: ${currNode[name].path}`);
            extra.startup[currNode[name].startup] = currNode[name].path.split('.')[0];
        }
    };
}

// Generate the whole virtual filesystem with extra information.
async function processAll() {
    const fs = {};
    const extra = {
        link: {},
        startup: {},
    };
    return processDirectory('.', fs, extra).then(() => {
        for (const type of Object.keys(extra)) {
            const sorted = [];
            for (const k of Object.keys(extra[type]).sort()) {
                sorted.push(extra[type][k]);
            }
            extra[type] = sorted;
        }
        const result = { fs, ...extra };
        return result;
    });
}

// Cleanup & copy necessary files
fs.rmSync(path.resolve(OUTPUT_DIR), { force: true, recursive: true });
fs.mkdirSync(path.resolve(OUTPUT_DIR));
fs.cpSync(path.resolve('ctos/ctos'), path.resolve(OUTPUT_DIR, 'ctos'), { recursive: true });
fs.copyFileSync(path.resolve('ctos/index.html'), path.resolve(OUTPUT_DIR, 'index.html'));
for (const file of EXTRA_COPIES) {
    console.log(`Copy: ${file}`);
    fs.cpSync(path.resolve(file), path.resolve(OUTPUT_DIR, file), { recursive: true });
}

// Build
const result = await processAll();
fs.writeFileSync(path.resolve(OUTPUT_DIR, 'init.json'), JSON.stringify(result, null, 2));
