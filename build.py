from pathlib import Path
from shutil import copy2, copytree, rmtree
import json
import re

CTOS_DIR = 'ctos'
OUTPUT_DIR = 'public'
CONTENT_DIR = 'content'
EXTRA_COPIES = ['favicon.png']
ACTION_TABLE = {
    '.': {
        'type': 'folder',
        'icon': 'folder',
        'style': 'medium'
    },
    '.html': {
        'type': 'url',
        'icon': 'text',
        'style': 'large'
    },
    '.md': {
        'type': 'md',
        'icon': 'text',
        'style': 'large'
    },
    'index.html': {
        'type': 'iframe',
        'icon': 'exe',
        'style': 'large'
    },
    '.js': {
        'type': 'js',
        'icon': 'exe',
        'style': 'hidden'
    },
}
output = {
    'file': {},
    'link': {},
    'startup': {}
}


def parse_metadata(path):
    is_html = path.suffix in {'.html', '.md'}
    result = {}
    with path.open() as f:
        for line in f:
            # Strip HTML comments
            line = line.strip()
            if is_html:
                match = re.match('^<!--(.+)-->$', line)
                if not match:
                    break
                line = match.group(1).strip()

            # Extract key and values as groups
            match = re.match('^\\s*(\\w+)\\s*:\\s*([^:]+)\\s*$', line)
            if not match:
                break
            key = match.group(1).strip()
            values = match.group(2).strip()

            if values.find(',') != -1:
                result[key] = [x.strip() for x in values.split(',')]
            else:
                result[key] = values

    return result


def process_dir(path, node):
    # Process all files recursively
    for child in path.iterdir():
        name = child.stem
        if child.is_dir():
            if (child/'index.html').exists():
                # Single iframe -- do not traverse into subfolders
                print('Iframe: {}'.format(child))

                node[name] = {
                    'name': name,
                    'file': '/'+str(child),
                    'path': '/'+str(child.relative_to(CONTENT_DIR))
                }
                node[name].update(ACTION_TABLE['index.html'])
                node[name].update(parse_metadata(child/'index.html'))
            else:
                # Subdirectory
                print('Folder: {}'.format(child))

                node[name] = {
                    'name': name,
                    'file': {},
                    'path': '/'+str(child.relative_to(CONTENT_DIR))
                }
                node[name].update(ACTION_TABLE['.'])
                if (child/'metadata').exists():
                    node[name].update(parse_metadata(child/'metadata'))
                process_dir(child, node[name]['file'])

        elif child.suffix in ACTION_TABLE:
            # Single file
            print('File: {}'.format(child))

            node[name] = {
                'name': name,
                'file': '/'+str(child),
                'path': '/'+str(child.relative_to(CONTENT_DIR).with_suffix(''))
            }
            node[name].update(ACTION_TABLE[child.suffix])
            node[name].update(parse_metadata(child))
        else:
            continue

        # Add link and startup
        if 'link' in node[name]:
            print('Link: {}'.format(node[name]['path']))
            output['link'][node[name]['link']] = node[name]['path']
        if 'startup' in node[name]:
            print('Startup: {}'.format(node[name]['path']))
            output['startup'][node[name]['startup']] = node[name]['path']


process_dir(Path(CONTENT_DIR), output['file'])
output['link'] = [v for k, v in sorted(output['link'].items())]
output['startup'] = [v for k, v in sorted(output['startup'].items())]

# Copy necessary files
rmtree(Path(OUTPUT_DIR), ignore_errors=True)
Path(OUTPUT_DIR).mkdir()
copytree(Path(CTOS_DIR)/'ctos', Path(OUTPUT_DIR)/'ctos')
copy2(Path(CTOS_DIR)/'index.html', Path(OUTPUT_DIR))
# copy2(Path(CTOS_DIR)/'counter.js', 'functions')

# Copy content files
copytree(Path(CONTENT_DIR), Path(OUTPUT_DIR)/CONTENT_DIR)

# Copy extra files
for path in EXTRA_COPIES:
    if Path(path).is_dir():
        print('CopyFolder: {}'.format(path))
        copytree(path, Path(OUTPUT_DIR)/path, dirs_exist_ok=True)
    else:
        print('Copy: {}'.format(path))
        copy2(path, Path(OUTPUT_DIR))

# Dump config file
with open(Path(OUTPUT_DIR)/'init.json', 'w') as f:
    f.write(json.dumps(output, ensure_ascii=False, sort_keys=True))
