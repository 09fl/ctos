from pathlib import Path
from shutil import copy2, copytree, rmtree
import json
import re
import mistletoe

CTOS_DIR = 'ctos'
OUTPUT_DIR = 'public'
CONTENT_DIR = 'content'
EXTRA_COPIES = ['favicon.png']
HTML_EXTENSIONS = {'.html', '.md'}
COPY_EXTENSIONS = {'.jpg', '.png'}
DEFAULT_METADATA = {
    'folder': {
        'type': 'folder',
        'icon': 'folder',
        'style': 'medium'
    },
    'html': {
        'type': 'html',
        'icon': 'text',
        'style': 'large'
    },
    'iframe': {
        'type': 'iframe',
        'icon': 'exe',
        'style': 'large'
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
    (Path(OUTPUT_DIR)/path).mkdir()

    # Process all files recursively
    for child in path.iterdir():
        name = child.stem
        if child.is_dir():
            if (child/'index.html').exists():
                # Standalone app -- do not traverse into subfolders
                print('Iframe: {}'.format(child))

                node[name] = {
                    'name': name,
                    'file': '/'+str(child),
                    'path': '/'+str(child.relative_to(CONTENT_DIR))
                }
                node[name].update(DEFAULT_METADATA['iframe'])
                node[name].update(parse_metadata(child/'index.html'))

                copytree(child, Path(OUTPUT_DIR)/child)
            else:
                # Subdirectory
                print('Folder: {}'.format(child))

                node[name] = {
                    'name': name,
                    'file': {},
                    'path': '/'+str(child.relative_to(CONTENT_DIR))
                }
                node[name].update(DEFAULT_METADATA['folder'])
                if (child/'metadata').exists():
                    node[name].update(parse_metadata(child/'metadata'))
                process_dir(child, node[name]['file'])

        elif child.suffix in HTML_EXTENSIONS:
            # Single file
            print('Html: {}'.format(child))

            node[name] = {
                'name': name,
                'file': '/'+str(child.with_suffix('')),
                'path': '/'+str(child.relative_to(CONTENT_DIR).with_suffix(''))
            }
            node[name].update(DEFAULT_METADATA['html'])
            node[name].update(parse_metadata(child))

            # Parse markdown if needed
            if child.suffix == '.md':
                with open(child, 'r') as src:
                    rendered = mistletoe.markdown(src)
                with open((Path(OUTPUT_DIR)/child).with_suffix('.html'), 'w') as dst:
                    dst.write(rendered)
            else:
                copy2(child, Path(OUTPUT_DIR)/child)
        elif child.suffix in COPY_EXTENSIONS:
            print('Copy: {}'.format(child))
            copy2(child, Path(OUTPUT_DIR)/child)

        # Add link and startup
        if name in node and 'link' in node[name]:
            print('Link: {}'.format(node[name]['path']))
            output['link'][node[name]['link']] = node[name]['path']
        if name in node and 'startup' in node[name]:
            print('Startup: {}'.format(node[name]['path']))
            output['startup'][node[name]['startup']] = node[name]['path']


# Cleanup & copy necessary files
rmtree(Path(OUTPUT_DIR), ignore_errors=True)
Path(OUTPUT_DIR).mkdir()
copytree(Path(CTOS_DIR)/'ctos', Path(OUTPUT_DIR)/'ctos')
copy2(Path(CTOS_DIR)/'index.html', Path(OUTPUT_DIR))
# copy2(Path(CTOS_DIR)/'counter.js', 'functions')

# Build
process_dir(Path(CONTENT_DIR), output['file'])
output['link'] = [v for k, v in sorted(output['link'].items())]
output['startup'] = [v for k, v in sorted(output['startup'].items())]

# Dump config file
with open(Path(OUTPUT_DIR)/'init.json', 'w') as f:
    f.write(json.dumps(output, ensure_ascii=False, sort_keys=True))

# Copy extra files
for path in EXTRA_COPIES:
    if Path(path).is_dir():
        print('CopyFolder: {}'.format(path))
        copytree(path, Path(OUTPUT_DIR)/path, dirs_exist_ok=True)
    else:
        print('Copy: {}'.format(path))
        copy2(path, Path(OUTPUT_DIR))
