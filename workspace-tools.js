(() => {
  if (window.__chatWorkspaceToolsLoaded) return;
  window.__chatWorkspaceToolsLoaded = true;

  const KEY = 'chatgpt-app:workspace:v1';
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        folders: Array.isArray(value.folders) ? value.folders : [],
        assignments: value.assignments && typeof value.assignments === 'object' ? value.assignments : {},
        notes: value.notes && typeof value.notes === 'object' ? value.notes : {},
        pins: value.pins && typeof value.pins === 'object' ? value.pins : {},
      };
    } catch {
      return { folders: [], assignments: {}, notes: {}, pins: {} };
    }
  };
  const state = read();
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const chatPath = (href) => {
    try {
      const url = new URL(href, location.href);
      return url.origin === location.origin && /^\/(c|g)\/[\w-]+/.test(url.pathname) ? url.pathname : null;
    } catch {
      return null;
    }
  };
  const element = (tag, className, label) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  };
  const button = (label, action, title = label) => {
    const node = element('button', 'cw-button', label);
    node.type = 'button';
    node.title = title;
    node.addEventListener('click', action);
    return node;
  };
  const chatLinks = () => {
    const seen = new Map();
    document.querySelectorAll('a[href*="/c/"], a[href*="/g/"]').forEach((anchor) => {
      if (anchor.closest('#cw-panel')) return;
      const path = chatPath(anchor.href);
      if (path && !seen.has(path)) seen.set(path, anchor.textContent.trim() || path);
    });
    for (const [path, title] of Object.entries(state.pins)) {
      if (chatPath(path) && !seen.has(path)) seen.set(path, title || path);
    }
    return [...seen].map(([path, title]) => ({ path, title }));
  };

  const css = element('style');
  css.textContent = `
    #cw-launch, #cw-panel { font: 14px system-ui, sans-serif; color: #f5f5f5; color-scheme: dark; z-index: 2147483000; }
    #cw-launch { position: fixed; top: 66px; right: 18px; padding: 8px 12px; background: #262626; border: 1px solid #575757; border-radius: 6px; cursor: pointer; }
    #cw-panel { position: fixed; top: 0; right: 0; width: min(400px, 100vw); height: 100dvh; box-sizing: border-box; background: #181818; border-left: 1px solid #444; box-shadow: -8px 0 28px #0008; display: none; flex-direction: column; }
    #cw-panel.cw-open { display: flex; }
    #cw-panel * { box-sizing: border-box; }
    #cw-panel .cw-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #3a3a3a; }
    #cw-panel h2 { font-size: 16px; margin: 0; font-weight: 650; }
    #cw-panel .cw-body { overflow: auto; padding: 14px; display: grid; gap: 18px; }
    #cw-panel section { display: grid; gap: 8px; }
    #cw-panel h3 { font-size: 13px; margin: 0; font-weight: 600; }
    #cw-panel .cw-line { display: flex; align-items: center; gap: 6px; }
    #cw-panel .cw-line > input { flex: 1; min-width: 0; }
    #cw-panel input, #cw-panel textarea, #cw-panel select { background: #272727; border: 1px solid #555; border-radius: 4px; color: #f5f5f5; padding: 7px; font: inherit; }
    #cw-panel textarea { width: 100%; min-height: 100px; resize: vertical; }
    #cw-panel .cw-button { background: #303030; color: inherit; border: 1px solid #575757; border-radius: 4px; padding: 7px 9px; cursor: pointer; }
    #cw-panel .cw-button:hover, #cw-launch:hover { background: #444; }
    #cw-panel .cw-list { display: grid; gap: 2px; max-height: 40vh; overflow: auto; }
    #cw-panel .cw-chat { display: grid; grid-template-columns: minmax(0,1fr) 110px 32px; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid #303030; }
    #cw-panel .cw-chat a { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f5f5f5; text-decoration: none; }
    #cw-panel .cw-chat select { width: 100%; padding: 5px; }
    #cw-panel .cw-muted { color: #aaa; font-size: 12px; }
  `;
  document.head.append(css);
  const launch = button('Organizar', () => {
    panel.classList.toggle('cw-open');
    if (panel.classList.contains('cw-open')) render();
  }, 'Organizar conversas, notas e favoritos');
  launch.id = 'cw-launch';
  const panel = element('aside');
  panel.id = 'cw-panel';
  panel.setAttribute('aria-label', 'Organizador de conversas');
  const header = element('div', 'cw-header');
  header.append(element('h2', '', 'Organizador'), button('×', () => panel.classList.remove('cw-open'), 'Fechar'));
  const body = element('div', 'cw-body');
  panel.append(header, body);
  document.body.append(launch, panel);

  const render = () => {
    body.replaceChildren();
    const current = chatPath(location.href);
    const notes = element('section');
    notes.append(element('h3', '', 'Notas da conversa'));
    const editor = element('textarea');
    editor.placeholder = current ? 'Anotações privadas desta conversa' : 'Abra uma conversa para anotar';
    editor.disabled = !current;
    editor.value = current ? state.notes[current] || '' : '';
    editor.addEventListener('input', () => {
      state.notes[current] = editor.value;
      save();
    });
    notes.append(editor);
    body.append(notes);

    const folders = element('section');
    folders.append(element('h3', '', 'Pastas locais'));
    const folderLine = element('div', 'cw-line');
    const folderName = element('input');
    folderName.placeholder = 'Nome da pasta';
    folderName.maxLength = 80;
    const addFolder = () => {
      const name = folderName.value.trim();
      if (!name) return;
      state.folders.push({ id: crypto.randomUUID(), name });
      save();
      render();
    };
    folderName.addEventListener('keydown', (event) => { if (event.key === 'Enter') addFolder(); });
    folderLine.append(folderName, button('Adicionar', addFolder));
    folders.append(folderLine);
    for (const folder of state.folders) {
      const line = element('div', 'cw-line');
      const label = element('span', '', folder.name);
      label.style.flex = '1';
      line.append(label, button('×', () => {
        if (!confirm(`Excluir a pasta "${folder.name}"? As conversas não serão excluídas.`)) return;
        state.folders = state.folders.filter((item) => item.id !== folder.id);
        for (const [path, id] of Object.entries(state.assignments)) {
          if (id === folder.id) delete state.assignments[path];
        }
        save();
        render();
      }, 'Excluir pasta'));
      folders.append(line);
    }
    body.append(folders);

    const chats = element('section');
    chats.append(element('h3', '', 'Conversas carregadas'));
    const search = element('input');
    search.type = 'search';
    search.placeholder = 'Buscar conversa ou pasta';
    const list = element('div', 'cw-list');
    const entries = chatLinks();
    const renderList = () => {
      list.replaceChildren();
      const query = search.value.trim().toLocaleLowerCase();
      for (const chat of entries) {
        const folder = state.folders.find((item) => item.id === state.assignments[chat.path]);
        if (query && !(`${chat.title} ${folder?.name || ''} ${state.notes[chat.path] || ''}`).toLocaleLowerCase().includes(query)) continue;
        const line = element('div', 'cw-chat');
        const link = element('a', '', chat.title);
        link.href = chat.path;
        link.title = chat.title;
        const select = element('select');
        select.setAttribute('aria-label', `Pasta de ${chat.title}`);
        const none = element('option', '', 'Sem pasta');
        none.value = '';
        select.append(none);
        for (const item of state.folders) {
          const option = element('option', '', item.name);
          option.value = item.id;
          select.append(option);
        }
        select.value = state.assignments[chat.path] || '';
        select.addEventListener('change', () => {
          if (select.value) state.assignments[chat.path] = select.value;
          else delete state.assignments[chat.path];
          save();
        });
        const pin = button(state.pins[chat.path] ? '★' : '☆', () => {
          if (state.pins[chat.path]) delete state.pins[chat.path];
          else state.pins[chat.path] = chat.title;
          save();
          render();
        }, 'Fixar conversa');
        line.append(link, select, pin);
        list.append(line);
      }
      if (!list.childElementCount) list.append(element('p', 'cw-muted', 'Nenhuma conversa carregada. Abra a barra lateral do ChatGPT ou atualize a lista.'));
    };
    search.addEventListener('input', renderList);
    chats.append(search, button('Atualizar lista', render), list);
    body.append(chats);
    renderList();
  };
  const refreshOpenPanel = () => {
    if (panel.classList.contains('cw-open')) render();
  };
  window.addEventListener('popstate', refreshOpenPanel);
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || !chatPath(link.href)) return;
    setTimeout(refreshOpenPanel, 400);
    setTimeout(refreshOpenPanel, 1200);
  }, true);
})();
