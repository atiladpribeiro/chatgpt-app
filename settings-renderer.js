const sectionMeta = {
  general: ['Geral', 'Inicialização e comportamento do aplicativo.'],
  appearance: ['Janela e aparência', 'Zoom, mini janela e experiência visual.'],
  login: ['Login e sessão', 'Controle a sessão isolada do aplicativo.'],
  integration: ['Integração KDE', 'Atalho global, autostart e caminho do AppImage.'],
  diagnostics: ['Diagnóstico', 'Estado técnico e manutenção local.'],
};

const checkboxIds = [
  'automaticSessionRepair',
  'autoStart',
  'autoStartToTray',
  'backgroundEfficiency',
  'closeToTray',
  'miniAlwaysOnTop',
  'minimizeToTray',
  'repairKdeShortcutOnStart',
  'syncMiniWithMain',
];

const $ = (id) => document.getElementById(id);
let currentSettings = null;
let zoomTimer = null;

function setBusy(button, busy) {
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

function showInline(node, message, type = '') {
  node.textContent = message || '';
  node.className = `inline-status ${type}`.trim();
}

function showGlobal(message, type = 'neutral') {
  const node = $('globalStatus');
  node.textContent = message;
  node.className = `status-pill ${type}`;
}

function updateDependencies() {
  document.querySelectorAll('[data-depends]').forEach((row) => {
    const control = $(row.dataset.depends);
    const dependentControl = row.querySelector('input');
    const disabled = !control.checked;
    row.classList.toggle('disabled', disabled);
    dependentControl.disabled = disabled;
  });
}

function applySettings(data) {
  currentSettings = data;
  checkboxIds.forEach((id) => { $(id).checked = Boolean(data[id]); });
  $('zoomRange').min = String(data.zoomMinPercent);
  $('zoomRange').max = String(data.zoomMaxPercent);
  $('zoomRange').step = String(data.zoomStepPercent);
  $('zoomRange').value = String(data.zoomPercent);
  $('zoomValue').textContent = `${data.zoomPercent}%`;
  updateDependencies();
}

async function saveSettings() {
  $('saveState').textContent = 'Salvando…';
  const patch = Object.fromEntries(checkboxIds.map((id) => [id, $(id).checked]));
  try {
    const result = await window.settingsApi.save(patch);
    applySettings(result.settings);
    $('saveState').textContent = 'Tudo salvo';
  } catch (error) {
    $('saveState').textContent = 'Falha ao salvar';
    showGlobal(error.message, 'error');
  }
}

async function applyZoom(promise) {
  try {
    const result = await promise;
    applySettings(result.settings || result);
  } catch (error) {
    showGlobal(error.message, 'error');
  }
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let amount = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount.toFixed(amount >= 100 ? 0 : 1)} ${unit}`;
}

function renderSession(status) {
  const indicator = $('sessionIndicator');
  indicator.className = 'session-indicator';
  if (status.state === 'signed-in') {
    indicator.classList.add('ok');
    $('sessionTitle').textContent = 'Sessão conectada';
    $('sessionDescription').textContent = 'A página confirmou que a conta está pronta para uso neste perfil isolado.';
    showGlobal('Sessão conectada', 'ok');
  } else if (status.state === 'cookies-present') {
    indicator.classList.add('warn');
    $('sessionTitle').textContent = 'Sessão armazenada, aguardando validação';
    $('sessionDescription').textContent = 'Há credenciais locais, mas nenhuma janela confirmou o login ainda.';
    showGlobal('Validação pendente', 'warn');
  } else {
    $('sessionTitle').textContent = 'Sessão desconectada';
    $('sessionDescription').textContent = 'Entre no app ou importe uma sessão válida do navegador.';
    showGlobal('Sem login', 'neutral');
  }
}

async function refreshSession() {
  const button = $('refreshSession');
  setBusy(button, true);
  try {
    renderSession(await window.settingsApi.getSessionStatus());
  } catch (error) {
    showGlobal(error.message, 'error');
  } finally {
    setBusy(button, false);
  }
}

function diagnosticRows(data) {
  const integration = data.integration;
  const session = data.session;
  const sessionState = {
    'signed-in': 'Conectada',
    'cookies-present': 'Aguardando validação',
    'signed-out': 'Desconectada',
  }[session.state] || session.state;
  return [
    ['Versão', `${data.appVersion} · Electron ${data.electronVersion}`],
    ['Chromium', data.chromiumVersion],
    ['Plataforma', data.platform],
    ['Processos do app', String(data.processCount)],
    ['Memória privada', formatBytes(data.memoryPrivateKb * 1024)],
    ['Cache', formatBytes(data.cacheSize)],
    ['Sessão', `${sessionState} · ${session.sessionCookieCount} cookies de sessão`],
    ['Atalho KDE', integration.kdeShortcutConfigured ? 'Alt + Espaço configurado' : 'Não configurado'],
    ['AppImage ativo', integration.appImagePath],
    ['Perfil isolado', data.userDataPath],
  ];
}

async function refreshDiagnostics() {
  const button = $('refreshDiagnostics');
  setBusy(button, true);
  try {
    const data = await window.settingsApi.getDiagnostics();
    $('version').textContent = `Versão ${data.appVersion}`;
    $('diagnosticGrid').replaceChildren(...diagnosticRows(data).map(([label, value]) => {
      const wrapper = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      wrapper.append(term, description);
      return wrapper;
    }));
    const shortcutOk = data.integration.kdeShortcutConfigured && data.integration.desktopPointsToCurrentAppImage;
    $('shortcutBadge').textContent = shortcutOk ? 'Configurado' : 'Requer reparo';
    $('shortcutBadge').className = `status-pill ${shortcutOk ? 'ok' : 'warn'}`;
    renderSession(data.session);
  } catch (error) {
    showGlobal(error.message, 'error');
  } finally {
    setBusy(button, false);
  }
}

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.settings-section').forEach((section) => section.classList.toggle('active', section.id === button.dataset.section));
    [$('pageTitle').textContent, $('pageDescription').textContent] = sectionMeta[button.dataset.section];
    if (button.dataset.section === 'diagnostics') refreshDiagnostics();
    if (button.dataset.section === 'login') refreshSession();
  });
});

checkboxIds.forEach((id) => $(id).addEventListener('change', saveSettings));
$('zoomOut').addEventListener('click', () => applyZoom(window.settingsApi.adjustZoom(-0.05)));
$('zoomIn').addEventListener('click', () => applyZoom(window.settingsApi.adjustZoom(0.05)));
$('zoomReset').addEventListener('click', () => applyZoom(window.settingsApi.resetZoom()));
$('zoomRange').addEventListener('input', () => {
  $('zoomValue').textContent = `${$('zoomRange').value}%`;
  clearTimeout(zoomTimer);
  zoomTimer = setTimeout(() => applyZoom(window.settingsApi.setZoom(Number($('zoomRange').value) / 100)), 180);
});

$('openKde').addEventListener('click', () => window.settingsApi.openKdeShortcuts());
$('installShortcut').addEventListener('click', async () => {
  const button = $('installShortcut');
  setBusy(button, true);
  showInline($('shortcutStatus'), 'Reparando a integração com o KDE…');
  try {
    const result = await window.settingsApi.installKdeShortcut();
    showInline($('shortcutStatus'), `${result.shortcut} configurado para ${result.appImagePath}.`, 'success');
    await refreshDiagnostics();
  } catch (error) {
    showInline($('shortcutStatus'), error.message, 'error');
  } finally {
    setBusy(button, false);
  }
});

$('beginExternalLogin').addEventListener('click', async () => {
  const button = $('beginExternalLogin');
  setBusy(button, true);
  showInline($('loginStatus'), 'Navegador aberto. O app aguardará uma sessão válida por até 15 minutos.');
  try {
    await window.settingsApi.beginExternalLogin();
  } catch (error) {
    showInline($('loginStatus'), error.message, 'error');
  } finally {
    setBusy(button, false);
  }
});

$('importSession').addEventListener('click', async () => {
  const button = $('importSession');
  setBusy(button, true);
  showInline($('loginStatus'), 'Importando a sessão atual do Zen ou Firefox…');
  try {
    const result = await window.settingsApi.importBrowserSession();
    if (!result.ok) throw new Error(result.error || 'Nenhuma sessão válida foi encontrada.');
    showInline($('loginStatus'), `${result.imported} cookies importados. A sessão anterior do app foi substituída.`, 'success');
    await refreshSession();
  } catch (error) {
    showInline($('loginStatus'), error.message, 'error');
  } finally {
    setBusy(button, false);
  }
});

$('freshLogin').addEventListener('click', async () => {
  if (!window.confirm('Limpar somente a sessão do ChatGPT neste aplicativo e abrir uma nova tela de login?')) return;
  const button = $('freshLogin');
  setBusy(button, true);
  showInline($('loginStatus'), 'Limpando somente a sessão isolada do aplicativo…');
  try {
    await window.settingsApi.clearSession();
    showInline($('loginStatus'), 'Sessão do app limpa. A janela principal foi aberta para um novo login.', 'success');
    await refreshSession();
  } catch (error) {
    showInline($('loginStatus'), error.message, 'error');
  } finally {
    setBusy(button, false);
  }
});

$('refreshSession').addEventListener('click', refreshSession);
$('refreshDiagnostics').addEventListener('click', refreshDiagnostics);
$('clearCache').addEventListener('click', async () => {
  const button = $('clearCache');
  setBusy(button, true);
  try {
    const result = await window.settingsApi.clearCache();
    showInline($('maintenanceStatus'), `${formatBytes(result.clearedBytes)} de cache removidos.`, 'success');
    await refreshDiagnostics();
  } catch (error) {
    showInline($('maintenanceStatus'), error.message, 'error');
  } finally {
    setBusy(button, false);
  }
});

async function initialize() {
  try {
    applySettings(await window.settingsApi.get());
    await refreshDiagnostics();
  } catch (error) {
    showGlobal(error.message, 'error');
  } finally {
    document.documentElement.dataset.ready = 'true';
  }
}

initialize();
