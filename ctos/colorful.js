// Create DOM tree for empty desktop
function prepareDom() {
    const template = document.createElement('template');
    // Add desktop
    template.innerHTML = `
    <div class="arena">
        <div class="desktop"></div>
        <div class="bar">
            <div class="start">
            </div>
            <div class="taskbar"></div>
            <div class="status"></div>
            <div class="menu">
                <div class="ribbon"></div>
                <div class="list"></div>
            </div>
        </div>
    </div>`;

    // Add start bar
    const startLogo = '★カラフル';
    for (let i = 0; i < startLogo.length; i++) {
        const span = document.createElement('span');
        span.textContent = startLogo[i];
        template.content.querySelector('.start').appendChild(span);
    }
    template.content.querySelector('.start').addEventListener('click', () => {
        const startMenu = document.querySelector('.menu');
        if (!startMenu.style.display || startMenu.style.display == 'none') {
            startMenu.style.display = 'grid';
            document.querySelector('.start').classList.add('active');
        } else {
            startMenu.style.display = 'none';
            document.querySelector('.start').classList.remove('active');
        }
    });

    document.body.appendChild(template.content);
}

// Function triggered when window is moved to foreground
function putWindowOnTop(target) {
    const windows = document.querySelectorAll('.window');
    for (const w of windows) {
        if (w.style.zIndex > target.style.zIndex) {
            w.style.zIndex--;
        }
    }
    target.style.zIndex = windows.length;
    const activeTask = document.querySelector('.bar>.taskbar>.task.active');
    if (activeTask) {
        activeTask.classList.remove('active');
    }
    document.getElementById(`t${target.id.slice(1)}`).classList.add('active');
    if (target.hasAttribute('path')) {
        history.replaceState(null, '', target.getAttribute('path'));
    }
}

// Create DOM tree for empty window
function createWindow(title, styles) {
    const template = document.createElement('template');
    // Add empty window
    template.innerHTML = `
    <div class="window">
        <div class="header">
            <div class="title">${title}</div>
            <div class="button minimize"></div>
            <div class="button maximize"></div>
            <div class="button close"></div>
        </div>
        <div class="content"></div>
    </div>`;

    // Initialize window id
    const divWindow = template.content.querySelector('.window');
    divWindow.id = `w${parseInt(Math.random() * 1e6)}`;
    divWindow.classList.add(...styles);
    divWindow.style.zIndex = document.querySelectorAll('.window').length + 1;
    divWindow.addEventListener('mousedown', () => {
        putWindowOnTop(divWindow);
    });

    // Add handler for moving window
    const divTitle = template.content.querySelector('.title');
    function dragFn(ev) {
        divWindow.style.left = `${parseFloat(divWindow.style.left) + ev.movementX}px`;
        divWindow.style.top = `${parseFloat(divWindow.style.top) + ev.movementY}px`;
        divWindow.classList.add('dragging');
    }
    divTitle.addEventListener('pointerdown', (ev) => {
        if (divWindow.classList.contains('maximized')) {
            return;
        }
        divTitle.setPointerCapture(ev.pointerId);
        divTitle.addEventListener('pointermove', dragFn);
    });
    divTitle.addEventListener('pointerup', () => {
        if (divWindow.classList.contains('maximized')) {
            return;
        }
        divWindow.classList.remove('dragging');
        divTitle.removeEventListener('pointermove', dragFn);
    });

    // Add handler for re-sizing and closing window
    function updatePath() {
        const allWindows = Array.from(document.querySelectorAll('.window')).filter(w => w.style.display != 'none');
        const maxZ = allWindows.reduce((acc, curr) => {
            return Math.max(acc, curr.style.zIndex);
        }, 0);
        if (maxZ > 0) {
            const topWindow = allWindows.filter(w => w.style.zIndex == maxZ)[0];
            if (topWindow.hasAttribute('path')) {
                history.replaceState(null, '', topWindow.getAttribute('path'));
            }
        } else {
            history.replaceState(null, '', '/');
        }
    }
    template.content.querySelector('.minimize').addEventListener('click', () => {
        document.getElementById(`t${divWindow.id.slice(1)}`).classList.remove('active');
        divWindow.style.display = 'none';
        updatePath();
    });
    function maximizeFn() {
        if (divWindow.classList.contains('maximized')) {
            divWindow.classList.remove('maximized');
        } else {
            divWindow.classList.add('maximized');
        }
    }
    template.content.querySelector('.maximize').addEventListener('click', maximizeFn);
    divTitle.addEventListener('dblclick', maximizeFn);
    template.content.querySelector('.close').addEventListener('click', () => {
        document.getElementById(`t${divWindow.id.slice(1)}`).remove();
        divWindow.remove();
        updatePath();
    });

    // Attach to desktop
    document.querySelector('.desktop').appendChild(divWindow);
    divWindow.style.left = `${Math.random() / 2 * (document.querySelector('.arena').offsetWidth - divWindow.offsetWidth)}px`;
    divWindow.style.top = `${Math.random() / 3 * (document.querySelector('.arena').offsetHeight - divWindow.offsetHeight)}px`;
    // Add entry on taskbar
    const divTask = document.createElement('div');
    divTask.id = `t${divWindow.id.slice(1)}`;
    divTask.classList.add('task');
    divTask.textContent = title;
    divTask.addEventListener('click', () => {
        divWindow.style.display = 'grid';
        putWindowOnTop(divWindow);
    });
    document.querySelector('.taskbar').appendChild(divTask);

    return divWindow;
}

// Execute an action
async function execute(action) {
    let style = [];
    if (Array.isArray(action.style)) {
        style = action.style;
    } else if (typeof action.style === 'string') {
        style = [action.style];
    }
    const newWindow = createWindow(action.name, style);
    if (action.path) {
        newWindow.setAttribute('path', action.path);
    }
    const newContent = newWindow.children[1];
    switch (action.type) {
        case 'html': {
            // External html
            const response = await fetch(`${action.path}.html`);
            const template = document.createElement('template');
            template.innerHTML = await response.text();
            // Load JS scripts
            for (const script of template.content.querySelectorAll('script')) {
                script.remove();
                const scriptNew = document.createElement('script');
                scriptNew.type = 'module';
                // Process inline script only
                if (script.hasAttribute('src')) {
                    console.log(`script ${script.getAttribute('src')} ignored`);
                }
                else {
                    scriptNew.innerHTML = script.innerHTML;
                    scriptNew.innerHTML += `main(document.getElementById('${newWindow.id}'));`;
                    template.content.appendChild(scriptNew);
                }
            }
            newContent.appendChild(template.content);
            break;
        }
        case 'folder': {
            // Folder
            const template = document.createElement('template');
            template.innerHTML = `
            <div class="folder-meta"><span>${action.name}</span><span>${action.path}</span></div>
            <div class="folder-desc">${action.desc || ''}</div>
            <div class="folder"></div>`;
            for (const child in action.contents) {
                template.content.querySelector('.folder').appendChild(createIcon(action.contents[child]));
            }
            newContent.appendChild(template.content);
            break;
        }
        case 'iframe': {
            // Standalone app
            const iframe = document.createElement('iframe');
            iframe.setAttribute('src', `${action.path}/index.html`);
            iframe.setAttribute('scrolling', 'no');
            newContent.appendChild(iframe);
            break;
        }
        default:
            console.log(`undefined action: ${action}`);
    }

    putWindowOnTop(newWindow);
}

// Create an entry in start bar
function createEntry(action) {
    const divEntry = document.createElement('div');
    divEntry.classList.add('entry');
    divEntry.textContent = action.name;
    if (action.type) {
        divEntry.addEventListener('click', () => {
            execute(action);
        });
    }
    document.querySelector('.list').appendChild(divEntry);
}

// Create an icon on desktop
function createIcon(action) {
    const template = document.createElement('template');
    const iconUrl = action.icon.includes('.') ? action.icon : `/ctos/icon/${action.icon}.png`;
    template.innerHTML = `
    <div class="iconwrap">
        <div class="icon">
            <img src="${iconUrl}" alt="${action.icon}">
            <div class="tag">${action.name}</div>
        </div>
    </div>`;

    if (action.type) {
        template.content.querySelector('.icon').addEventListener('click', () => {
            execute(action);
        });
    }
    return template.content;
}

// Find an action in config tree by path
function searchByPath(root, path) {
    let result = null;
    let curr = root;
    for (const part of path.split('/')) {
        if (!part) {
            continue;
        }
        if (typeof curr === 'object' && part in curr) {
            result = curr[part];
            curr = curr[part].contents;
        } else {
            return null;
        }
    }
    return result;
}

// Load config file and render desktop
async function loadDesktop(configUrl) {
    const response = await fetch(configUrl);
    const config = await response.json();

    // Initialize desktop icons and start menu entries
    for (const key in config.fs) {
        document.querySelector('.desktop').appendChild(createIcon(config.fs[key]));
    }
    for (const path of config.link) {
        createEntry(searchByPath(config.fs, path));
    }

    // Start the action by path or predefined startups
    const pathName = decodeURI(location.pathname);
    if (pathName.replaceAll('/', '') != '') {
        const action = searchByPath(config.fs, pathName);
        if (action) {
            execute(action);
        } else {
            window.location.replace('/ctos/404.html');
        }
    } else {
        for (const path of config.startup) {
            execute(searchByPath(config.fs, path));
        }
    }
}

// Render counter
async function loadCounter(counterUrl) {
    const divCounter = document.createElement('div');
    divCounter.classList.add('counter');
    const response = await fetch(counterUrl);
    if (response.ok) {
        divCounter.textContent = await response.text();
    } else {
        divCounter.textContent = '*******';
    }
    document.querySelector('.status').appendChild(divCounter);
}

prepareDom();
loadDesktop('/init.json');
loadCounter('/api/counter');
