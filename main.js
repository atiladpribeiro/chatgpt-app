const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  nativeTheme,
  screen,
  session,
  shell,
} = require('electron');
const { execFile, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const SERVICE = {
  id: 'chatgpt',
  name: 'ChatGPT App',
  trayTitle: 'ChatGPT App',
  desktopName: 'io.github.alexandephilia.chatgptlinux',
  startUrl: 'https://chatgpt.com/',
  externalLoginUrl: 'https://chatgpt.com/',
  icon: 'chatgpt.png',
  partition: 'persist:chatgpt-linux-app',
  trustedDomains: [
    'chatgpt.com',
    'chat.openai.com',
    'openai.com',
    'accounts.google.com',
    'google.com',
    'gstatic.com',
    'googleusercontent.com',
  ],
};

const DEFAULT_SETTINGS = {
  automaticSessionRepair: false,
  autoStart: false,
  autoStartToTray: true,
  backgroundEfficiency: true,
  closeToTray: true,
  miniAlwaysOnTop: true,
  minimizeToTray: true,
  repairKdeShortcutOnStart: true,
  syncMiniWithMain: true,
  quickAccessSeen: false,
  mainBounds: null,
  miniBounds: null,
  zoomFactor: 1,
};

const SMOKE_MODE = process.argv.includes('--smoke') || process.env.AI_WRAPPER_SMOKE === '1';
const IMPORT_TEST_MODE = process.argv.includes('--test-browser-import');
const KDE_SHORTCUT_TEST_MODE = process.argv.includes('--test-kde-shortcut-install');
const MINI_WINDOW_TEST_MODE = process.argv.includes('--test-mini-window');
const SESSION_PERSISTENCE_TEST_MODE = process.argv.includes('--test-session-persistence');
const SESSION_DETACH_TEST_MODE = process.argv.includes('--test-session-detach');
const SESSION_REPLACE_TEST_MODE = process.argv.includes('--test-session-replace');
const SESSION_RELOAD_POLICY_TEST_MODE = process.argv.includes('--test-session-reload-policy');
const SESSION_COOKIE_CHANGE_TEST_MODE = process.argv.includes('--test-session-cookie-change');
const EXPORTER_INTEGRATION_TEST_MODE = process.argv.includes('--test-exporter-integration');
const EXPORTER_PAGE_TEST_MODE = process.argv.includes('--test-exporter-page');
const SETTINGS_PAGE_TEST_MODE = process.argv.includes('--test-settings-page');
const TEST_MODE = SMOKE_MODE
  || IMPORT_TEST_MODE
  || KDE_SHORTCUT_TEST_MODE
  || MINI_WINDOW_TEST_MODE
  || SESSION_PERSISTENCE_TEST_MODE
  || SESSION_DETACH_TEST_MODE
  || SESSION_REPLACE_TEST_MODE
  || SESSION_RELOAD_POLICY_TEST_MODE
  || SESSION_COOKIE_CHANGE_TEST_MODE
  || EXPORTER_INTEGRATION_TEST_MODE
  || EXPORTER_PAGE_TEST_MODE
  || SETTINGS_PAGE_TEST_MODE;
const INSTANCE_LOCK_ENABLED = process.platform === 'linux' && !TEST_MODE;
const TOGGLE_MINI_ARG = '--toggle-mini';
const PREFERENCES_ARG = '--preferences';
const START_MINIMIZED_ARG = '--start-minimized';
const INSTALL_KDE_SHORTCUT_ARG = '--install-kde-shortcut';
const DEFAULT_ACCEPT_LANGUAGE = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
const GOOGLE_IDENTIFIER_TEST_EMAIL = 'codex.invalid.login.test.20260624@gmail.com';
const QUICK_ASK_DESKTOP_ACTION = 'QuickAsk';
const QUICK_ASK_SHORTCUT = 'Alt+Space';
const QUICK_ASK_QT_KEY = 134217760;
const MINI_WINDOW_WIDTH = 430;
const MINI_WINDOW_HEIGHT = 565;
const MINI_WINDOW_BOTTOM_MARGIN = 20;
const ZOOM_DEFAULT = 1;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.05;
const EXTERNAL_AUTH_DOMAINS = [
  'auth.openai.com',
  'auth0.openai.com',
  'accounts.google.com',
];
const EXTERNAL_COOKIE_DOMAINS = [
  'chatgpt.com',
  'openai.com',
];
const EXTERNAL_COOKIE_IMPORT_ENV = 'CHATGPT_EXTERNAL_COOKIE_DB';
const EXTERNAL_COOKIE_IMPORT_INTERVAL_MS = 6000;
const EXTERNAL_COOKIE_IMPORT_WINDOW_MS = 15 * 60 * 1000;
const TRUSTED_PERMISSIONS = new Set([
  'clipboard-read',
  'clipboard-sanitized-write',
  'display-capture',
  'fullscreen',
  'media',
  'notifications',
  'pointerLock',
  'storage-access',
]);
const CHATGPT_EXPORTER_ALL_LIMIT = 0;
const CHATGPT_EXPORTER_PT_BR_TRANSLATION = Object.freeze({
  title: 'Exportador do ChatGPT',
  ExportHelper: 'Exportar',
  Setting: 'Configuracoes',
  Language: 'Idioma',
  'Copy Text': 'Copiar texto',
  'Copied!': 'Copiado!',
  Screenshot: 'Captura',
  Markdown: 'Markdown',
  HTML: 'HTML',
  JSON: 'JSON',
  Archive: 'Arquivar',
  Save: 'Salvar',
  Delete: 'Excluir',
  Cancel: 'Cancelar',
  'Select All': 'Selecionar tudo',
  'Select...': 'Selecionar...',
  'Select Not Exported': 'Selecionar nao exportadas',
  'Select Updated': 'Selecionar atualizadas',
  'Shift Select Hint': 'Dica: Shift+clique seleciona um intervalo',
  Export: 'Exportar',
  Error: 'Erro',
  Loading: 'Carregando',
  Preview: 'Previa',
  'File Name': 'Nome do arquivo',
  'Export All': 'Exportar conversas',
  'Exporter Settings': 'Configuracoes do exportador',
  'Export Dialog Title': 'Exportar conversas',
  'Invalid File Format': 'Formato de arquivo invalido',
  'Export from official export file': 'Exportar de arquivo oficial',
  'Export from API': 'Exportar pela API',
  'Available variables': 'Variaveis disponiveis',
  'Conversation Timestamp': 'Horario das mensagens',
  'Conversation Timestamp Description': 'Mostra o horario das mensagens na exportacao.',
  'Enable on HTML': 'Ativar em HTML',
  'Enable on Markdown': 'Ativar em Markdown',
  'Use 24-hour format': 'Usar formato 24 horas (ex. 23:59)',
  'Export Format': 'Formato de exportacao',
  'Export Metadata': 'Exportar metadados',
  'Export Metadata Description': 'Adiciona metadados aos arquivos Markdown e HTML exportados.',
  'Export Thinking Process': 'Exportar processo de raciocinio',
  'Export Thinking Process Description': 'Inclui o processo de raciocinio do modelo em Markdown e HTML quando disponivel.',
  'Export Sources': 'Exportar fontes',
  'Export Sources Description': 'Inclui a lista de fontes exibida no final de cada resposta.',
  Sources: 'Fontes',
  'OpenAI Official Format': 'Formato oficial da OpenAI',
  'Conversation Archive Alert': 'Arquivar todas as conversas selecionadas?',
  'Conversation Archived Message': 'Conversas selecionadas arquivadas. Atualize a pagina para ver a mudanca.',
  'Conversation Delete Alert': 'Excluir todas as conversas selecionadas?',
  'Conversation Deleted Message': 'Conversas selecionadas excluidas. Atualize a pagina para ver a mudanca.',
  'Please start a conversation first': 'Inicie uma conversa primeiro.',
  'Temporary chat could not be captured': 'Nao foi possivel ler este chat temporario. Ainda e possivel exportar uma captura PNG.',
  'Select Project': 'Selecionar projeto',
  '(no project)': '(sem projeto)',
  'Export All Limit': 'Carregamento de conversas',
  'Export All Limit Description': 'Sem limite. O app carrega conversas ate a API informar que nao ha mais resultados.',
  'Select a source to load conversations': 'Selecione uma fonte para carregar conversas.',
  Search: 'Buscar',
  'Last 100': 'Selecionar carregadas',
  'No results': 'Nenhum resultado',
  'Date From': 'De',
  'Date To': 'Ate',
  'Date Filter Label': 'Data',
  'Date Filter Hint': 'Filtra pelo campo de data escolhido. Deixe em branco para nao filtrar.',
  'Date Filter Field Created': 'Criada',
  'Date Filter Field Updated': 'Atualizada',
  'Date Preset 7d': '7 dias',
  'Date Preset 30d': '30 dias',
  'Date Preset 90d': '90 dias',
  'Date Preset Year': 'Este ano',
  'Clear filter': 'Limpar',
  'Selected count': '{{count}} selecionadas',
  'Export batch info': 'Exportacao sem lotes artificiais no app Linux',
  'Exporting batch': 'Exportando lote {{current}} de {{total}}',
  'Export batches button': 'Exportar ({{n}} downloads)',
  'Batch progress': 'Lote {{current}}/{{total}}',
  'All conversations': 'Todas as conversas',
  'Load more conversations': 'Carregar mais {{n}}',
  'Load more conversations remaining': 'Carregar mais {{n}} - {{remaining}} restantes',
  'Export Skipped Message': '{{n}} conversas falharam apos novas tentativas e nao estao na exportacao:',
  'List Rate Limited Wait': 'API limitou as requisicoes. Aguarde {{n}}s e tente novamente',
  'List Rate Limited': 'API limitou as requisicoes. Tente novamente em instantes',
  'List Load Failed': 'Falha ao carregar conversas',
});

if (TEST_MODE) {
  app.setPath('userData', path.join(os.tmpdir(), `chatgpt-linux-test-${process.pid}`));
}

app.setName(SERVICE.name);
app.setDesktopName(`${SERVICE.desktopName}.desktop`);
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,GlobalShortcutsPortal');
app.commandLine.appendSwitch('user-agent', chromeUserAgent());
app.commandLine.appendSwitch('lang', 'pt-BR');

let appSession;
let mainWindow;
let miniWindow;
let settingsWindow;
let quickAccessWindow;
let tray;
let settings = { ...DEFAULT_SETTINGS };
let isQuitting = false;
let externalOpenEvents = [];
let externalAuthOpenEvents = [];
let externalBrowserImportTimer = null;
let externalBrowserImportInFlight = false;
let externalBrowserImportDeadline = 0;
let externalBrowserCookieSignature = '';
let externalBrowserImportWarned = false;
let sessionFlushTimer = null;
let sessionFlushInFlight = false;
let sessionRepairAttempted = false;
let quitAfterSessionFlush = false;
let quitSessionFlushComplete = false;
let instanceServer = null;
let ownsFileInstanceLock = false;
let isSecondaryInstance = false;
let pendingInstanceArgv = [];

function hasArg(args, name) {
  return args.includes(name);
}

function instanceRuntimeDir() {
  if (process.env.CHATGPT_INSTANCE_RUNTIME_DIR) {
    return process.env.CHATGPT_INSTANCE_RUNTIME_DIR;
  }

  return process.env.XDG_RUNTIME_DIR || os.tmpdir();
}

function instanceLockDir() {
  return process.env.CHATGPT_INSTANCE_LOCK_DIR
    || path.join(instanceRuntimeDir(), `${SERVICE.id}-single-instance.lock`);
}

function instanceSocketPath() {
  return process.env.CHATGPT_INSTANCE_SOCKET_PATH
    || path.join(instanceLockDir(), 'command.sock');
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readInstancePid() {
  const pid = Number.parseInt(safeReadFile(path.join(instanceLockDir(), 'pid')).trim(), 10);
  return Number.isFinite(pid) ? pid : 0;
}

function acquireFileInstanceLock() {
  if (!INSTANCE_LOCK_ENABLED) {
    return true;
  }

  const lockDir = instanceLockDir();
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.mkdirSync(lockDir, { mode: 0o700 });
      fs.writeFileSync(path.join(lockDir, 'pid'), `${process.pid}\n`);
      ownsFileInstanceLock = true;
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }

      const existingPid = readInstancePid();
      if (processIsAlive(existingPid)) {
        return false;
      }

      fs.rmSync(lockDir, { recursive: true, force: true });
    }
  }

  return false;
}

function releaseFileInstanceLock() {
  if (!ownsFileInstanceLock) {
    return;
  }

  ownsFileInstanceLock = false;
  try {
    fs.rmSync(instanceLockDir(), { recursive: true, force: true });
  } catch {}
}

function sendInstanceCommandToPrimary(argv) {
  if (!INSTANCE_LOCK_ENABLED) {
    return Promise.resolve(false);
  }

  const socketPath = instanceSocketPath();
  const payload = `${JSON.stringify({ argv })}\n`;
  const deadline = Date.now() + 3500;

  return new Promise((resolve) => {
    const tryConnect = () => {
      let settled = false;
      const client = net.createConnection(socketPath);

      const finish = (ok) => {
        if (settled) {
          return;
        }
        settled = true;
        client.destroy();
        if (ok || Date.now() >= deadline) {
          resolve(ok);
          return;
        }
        setTimeout(tryConnect, 120).unref();
      };

      client.setTimeout(700);
      client.on('connect', () => {
        client.end(payload);
      });
      client.on('close', () => finish(true));
      client.on('error', () => finish(false));
      client.on('timeout', () => finish(false));
    };

    tryConnect();
  });
}

function dispatchInstanceArgv(argv) {
  if (!Array.isArray(argv)) {
    return;
  }

  if (!app.isReady() || !appSession) {
    pendingInstanceArgv.push(argv);
    return;
  }

  if (handleAppCommand(argv)) {
    return;
  }

  showMainWindow();
}

function flushPendingInstanceArgv() {
  const queued = pendingInstanceArgv;
  pendingInstanceArgv = [];
  for (const argv of queued) {
    dispatchInstanceArgv(argv);
  }
}

function setupInstanceCommandServer() {
  if (!INSTANCE_LOCK_ENABLED || !ownsFileInstanceLock || instanceServer) {
    return;
  }

  const socketPath = instanceSocketPath();
  fs.rmSync(socketPath, { force: true });
  instanceServer = net.createServer((socket) => {
    let data = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      data += chunk;
    });
    socket.on('end', () => {
      try {
        const message = JSON.parse(data);
        dispatchInstanceArgv(message.argv);
      } catch (error) {
        console.warn(`[${SERVICE.id}] invalid instance command`, error.message);
      }
    });
  });
  instanceServer.on('error', (error) => {
    console.warn(`[${SERVICE.id}] instance command socket failed`, error.message);
  });
  instanceServer.listen(socketPath);
}

function closeInstanceCommandServer() {
  if (!instanceServer) {
    return;
  }

  instanceServer.close();
  instanceServer = null;
}

const gotFileInstanceLock = acquireFileInstanceLock();
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotFileInstanceLock || !gotSingleInstanceLock) {
  isSecondaryInstance = true;
  releaseFileInstanceLock();
  sendInstanceCommandToPrimary(process.argv)
    .then((sent) => {
      if (!sent) {
        console.warn(`[${SERVICE.id}] existing instance is running but did not accept the command socket.`);
      }
      app.exit(0);
    })
    .catch((error) => {
      console.warn(`[${SERVICE.id}] failed to contact existing instance`, error.message);
      app.exit(0);
    });
} else {
  setupInstanceCommandServer();
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');
    const saved = JSON.parse(raw);
    const parsed = { ...DEFAULT_SETTINGS, ...saved };
    if (!Object.prototype.hasOwnProperty.call(saved, 'autoStart') && fs.existsSync(autostartDesktopPath())) {
      parsed.autoStart = true;
      parsed.autoStartToTray = safeReadFile(autostartDesktopPath()).includes(START_MINIMIZED_ARG);
    }
    return { ...parsed, zoomFactor: normalizeZoomFactor(parsed.zoomFactor) };
  } catch {
    const autostartContent = safeReadFile(autostartDesktopPath());
    return {
      ...DEFAULT_SETTINGS,
      autoStart: Boolean(autostartContent),
      autoStartToTray: autostartContent ? autostartContent.includes(START_MINIMIZED_ARG) : DEFAULT_SETTINGS.autoStartToTray,
    };
  }
}

function writeSettings() {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  const settingsPath = getSettingsPath();
  const temporaryPath = `${settingsPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryPath, settingsPath);
}

function normalizeZoomFactor(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return ZOOM_DEFAULT;
  }

  const stepped = Math.round(numeric / ZOOM_STEP) * ZOOM_STEP;
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, stepped));
  return Math.round(clamped * 100) / 100;
}

function zoomPercent(value = settings.zoomFactor) {
  return Math.round(normalizeZoomFactor(value) * 100);
}

function applyZoomToWebContents(webContents) {
  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  webContents.setZoomFactor(normalizeZoomFactor(settings.zoomFactor));
}

function applyZoomToChatWindows() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.chatContentWindow) {
      applyZoomToWebContents(win.webContents);
    }
  }
}

function setZoomFactor(value) {
  settings.zoomFactor = normalizeZoomFactor(value);
  writeSettings();
  applyZoomToChatWindows();
  rebuildTrayMenu();
  createApplicationMenu();
  return publicSettings();
}

function adjustZoom(delta) {
  return setZoomFactor(normalizeZoomFactor(settings.zoomFactor) + delta);
}

function resetZoom() {
  return setZoomFactor(ZOOM_DEFAULT);
}

async function flushPersistentSessionData(reason = 'manual') {
  if (!appSession || sessionFlushInFlight) {
    return false;
  }

  sessionFlushInFlight = true;
  try {
    if (typeof appSession.flushStorageData === 'function') {
      appSession.flushStorageData();
    }
    if (appSession.cookies && typeof appSession.cookies.flushStore === 'function') {
      await appSession.cookies.flushStore();
    }
    return true;
  } catch (error) {
    console.warn(`[${SERVICE.id}] persistent session flush failed (${reason})`, error.message);
    return false;
  } finally {
    sessionFlushInFlight = false;
  }
}

function schedulePersistentSessionFlush(reason = 'cookie-change') {
  if (!appSession) {
    return;
  }

  if (sessionFlushTimer) {
    clearTimeout(sessionFlushTimer);
  }

  sessionFlushTimer = setTimeout(() => {
    sessionFlushTimer = null;
    flushPersistentSessionData(reason).catch((error) => {
      console.warn(`[${SERVICE.id}] scheduled persistent session flush failed`, error.message);
    });
  }, 2500);
}

function chromeVersion() {
  return process.versions.chrome || '120.0.0.0';
}

function chromeMajorVersion() {
  return chromeVersion().split('.')[0];
}

function chromeUserAgent() {
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion()} Safari/537.36`;
}

function chromeClientHints() {
  const major = chromeMajorVersion();
  return `"Google Chrome";v="${major}", "Chromium";v="${major}", "Not=A?Brand";v="24"`;
}

function chromeFullVersionList() {
  const major = chromeMajorVersion();
  return [
    { brand: 'Google Chrome', version: chromeVersion() },
    { brand: 'Chromium', version: chromeVersion() },
    { brand: 'Not=A?Brand', version: '24.0.0.0' },
  ].map(({ brand, version }) => `"${brand}";v="${version}"`).join(', ');
}

function chromeUserAgentMetadata() {
  const major = chromeMajorVersion();
  return {
    brands: [
      { brand: 'Google Chrome', version: major },
      { brand: 'Chromium', version: major },
      { brand: 'Not=A?Brand', version: '24' },
    ],
    fullVersionList: [
      { brand: 'Google Chrome', version: chromeVersion() },
      { brand: 'Chromium', version: chromeVersion() },
      { brand: 'Not=A?Brand', version: '24.0.0.0' },
    ],
    fullVersion: chromeVersion(),
    platform: 'Linux',
    platformVersion: '6.0.0',
    architecture: 'x86',
    model: '',
    mobile: false,
    bitness: '64',
    wow64: false,
  };
}

function browserIdentityScript() {
  const metadata = chromeUserAgentMetadata();
  const highEntropyValues = {
    architecture: metadata.architecture,
    bitness: metadata.bitness,
    brands: metadata.brands,
    fullVersionList: metadata.fullVersionList,
    mobile: metadata.mobile,
    model: metadata.model,
    platform: metadata.platform,
    platformVersion: metadata.platformVersion,
    uaFullVersion: metadata.fullVersion,
    wow64: metadata.wow64,
  };

  return `
    (() => {
      const metadata = ${JSON.stringify(metadata)};
      const highEntropyValues = ${JSON.stringify(highEntropyValues)};
      const defineGetter = (target, key, value) => {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            enumerable: true,
            get: () => value,
          });
        } catch {}
      };

      defineGetter(Navigator.prototype, 'webdriver', undefined);
      defineGetter(Navigator.prototype, 'platform', 'Linux x86_64');
      defineGetter(Navigator.prototype, 'languages', ['pt-BR', 'pt', 'en-US', 'en']);
      defineGetter(Navigator.prototype, 'language', 'pt-BR');
      defineGetter(Navigator.prototype, 'vendor', 'Google Inc.');
      defineGetter(Navigator.prototype, 'hardwareConcurrency', 8);
      defineGetter(Navigator.prototype, 'deviceMemory', 8);
      defineGetter(Navigator.prototype, 'maxTouchPoints', 0);
      defineGetter(Navigator.prototype, 'pdfViewerEnabled', true);

      const fakePluginArray = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];
      defineGetter(Navigator.prototype, 'plugins', fakePluginArray);
      defineGetter(Navigator.prototype, 'mimeTypes', [{ type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }]);

      const uaData = {
        brands: metadata.brands,
        mobile: metadata.mobile,
        platform: metadata.platform,
        toJSON: () => ({
          brands: metadata.brands,
          mobile: metadata.mobile,
          platform: metadata.platform,
        }),
        getHighEntropyValues: async (hints = []) => {
          const result = {
            brands: metadata.brands,
            mobile: metadata.mobile,
            platform: metadata.platform,
          };
          for (const hint of hints) {
            if (Object.prototype.hasOwnProperty.call(highEntropyValues, hint)) {
              result[hint] = highEntropyValues[hint];
            }
          }
          return result;
        },
      };
      defineGetter(Navigator.prototype, 'userAgentData', uaData);

      if (!window.chrome) {
        Object.defineProperty(window, 'chrome', {
          configurable: true,
          enumerable: true,
          value: {
            app: { isInstalled: false },
            runtime: {},
            csi: () => ({}),
            loadTimes: () => ({}),
          },
        });
      } else if (!window.chrome.runtime) {
        window.chrome.runtime = {};
      }

      const originalPermissionsQuery = navigator.permissions && navigator.permissions.query;
      if (originalPermissionsQuery) {
        navigator.permissions.query = (parameters) => {
          if (parameters && parameters.name === 'notifications') {
            return Promise.resolve({ state: Notification.permission });
          }
          return originalPermissionsQuery.call(navigator.permissions, parameters);
        };
      }
    })();
  `;
}

function rejectAfter(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

function debuggerCommand(webContents, command, params = {}) {
  return Promise.race([
    webContents.debugger.sendCommand(command, params),
    rejectAfter(2500, `${command} timed out`),
  ]);
}

async function applyBrowserIdentity(webContents) {
  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  try {
    if (!webContents.debugger.isAttached()) {
      webContents.debugger.attach('1.3');
    }

    await Promise.allSettled([
      debuggerCommand(webContents, 'Page.addScriptToEvaluateOnNewDocument', {
        source: browserIdentityScript(),
      }),
      debuggerCommand(webContents, 'Network.setUserAgentOverride', {
        userAgent: chromeUserAgent(),
        acceptLanguage: DEFAULT_ACCEPT_LANGUAGE,
        platform: 'Linux x86_64',
        userAgentMetadata: chromeUserAgentMetadata(),
      }),
    ]);
  } catch (error) {
    console.warn(`[${SERVICE.id}] browser identity override failed`, error.message);
  }
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function hostMatches(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isTrustedUrl(url) {
  const host = hostFromUrl(url);
  return Boolean(host) && SERVICE.trustedDomains.some((domain) => hostMatches(host, domain));
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function isChatGptPageUrl(url) {
  const host = hostFromUrl(url);
  return hostMatches(host, 'chatgpt.com') || hostMatches(host, 'chat.openai.com');
}

function shouldOpenExternally(url) {
  const host = hostFromUrl(url);
  return EXTERNAL_AUTH_DOMAINS.some((domain) => hostMatches(host, domain));
}

function hasAuthTransactionParameters(url) {
  try {
    const parsed = new URL(url);
    return [
      'auth_session_logging_id',
      'client_id',
      'connection',
      'redirect_uri',
      'state',
    ].some((parameter) => parsed.searchParams.has(parameter));
  } catch {
    return false;
  }
}

function externalTargetUrl(url) {
  return shouldOpenExternally(url) ? SERVICE.externalLoginUrl : url;
}

function openExternalUrl(url) {
  const isAuthHandoff = shouldOpenExternally(url);
  const targetUrl = externalTargetUrl(url);
  externalOpenEvents.push(targetUrl);
  if (isAuthHandoff) {
    externalAuthOpenEvents.push({
      sourceUrl: url,
      targetUrl,
      sourceHost: hostFromUrl(url),
      targetHost: hostFromUrl(targetUrl),
    });
    scheduleExternalBrowserSessionImport({ replaceExisting: true });
  }
  if (SMOKE_MODE) {
    return Promise.resolve();
  }
  return shell.openExternal(targetUrl);
}

let chatGptExporterInjectionSource = null;

function readBundledTextFile(...parts) {
  return fs.readFileSync(path.join(__dirname, ...parts), 'utf8');
}

function chatGptExporterBridgeSource() {
  return `
  function installCodexChatGptExporterBridge() {
    if (window.__codexChatGptExporter && window.__codexChatGptExporter.isReady) return;
    const PANEL_ID = "codex-chatgpt-exporter-panel";
    const STYLE_ID = "codex-chatgpt-exporter-panel-style";
    const MAX_EXPORT = ${CHATGPT_EXPORTER_ALL_LIMIT};
    let loadedConversations = [];
    const getFormat = () => ScriptStorage.get(KEY_FILENAME_FORMAT) || defaultFormat;
    const getMetaList = () => (ScriptStorage.get(KEY_META_ENABLED) ?? false) ? (ScriptStorage.get(KEY_META_LIST) || defaultExportMetaList) : [];
    const setStatus = (text, error) => {
      const node = document.querySelector("#" + PANEL_ID + " .codex-exporter-status");
      if (!node) return;
      node.textContent = text || "";
      node.dataset.error = error ? "true" : "false";
    };
    const currentActions = {
      text: () => exportToText(),
      png: () => exportToPng(getFormat()),
      markdown: () => exportToMarkdown(getFormat(), getMetaList()),
      html: () => exportToHtml(getFormat(), getMetaList()),
      officialJson: () => exportToJson(getFormat()),
      tavern: () => exportToTavern(getFormat()),
      ooba: () => exportToOoba(getFormat())
    };
    async function runCurrent(kind) {
      try {
        setStatus("Executando exportacao atual...");
        await currentActions[kind]();
        setStatus("Exportacao concluida.");
      } catch (error) {
        console.error("[Exporter]", error);
        setStatus(error.message || "Falha ao exportar.", true);
      }
    }
    async function loadConversations() {
      try {
        setStatus("Carregando conversas...");
        loadedConversations = [];
        renderConversationList();
        loadedConversations = await fetchAllConversations(null, MAX_EXPORT, (batch) => {
          loadedConversations.push(...batch);
          renderConversationList();
          setStatus("Carregadas " + loadedConversations.length + " conversas...");
        });
        renderConversationList();
        setStatus("Carregadas " + loadedConversations.length + " conversas.");
      } catch (error) {
        console.error("[Exporter]", error);
        setStatus(error.message || "Falha ao carregar conversas.", true);
      }
    }
    function selectedRows() {
      return Array.from(document.querySelectorAll("#" + PANEL_ID + " .codex-exporter-row input:checked"))
        .map((input) => loadedConversations.find((item) => item.id === input.value))
        .filter(Boolean);
    }
    async function fetchSelectedRows(rows, includeAssets) {
      const result = [];
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        setStatus("Baixando " + (index + 1) + "/" + rows.length + ": " + (row.title || row.id));
        result.push(await fetchConversation(row.id, includeAssets));
        await sleep(200);
      }
      return result;
    }
    async function runBulk(kind) {
      const rows = selectedRows();
      if (rows.length === 0) {
        setStatus("Selecione ao menos uma conversa.", true);
        return;
      }
      try {
        setStatus("Preparando " + rows.length + " conversas...");
        const includeAssets = kind !== "officialJson";
        const conversations = await fetchSelectedRows(rows, includeAssets);
        const format = getFormat();
        const metaList = getMetaList();
        if (kind === "markdown") await exportAllToMarkdown(format, conversations, metaList, null, 1, 1);
        if (kind === "html") await exportAllToHtml(format, conversations, metaList, null, 1, 1);
        if (kind === "officialJson") await exportAllToOfficialJson(format, conversations, metaList, null, 1, 1);
        if (kind === "jsonZip") await exportAllToJson(format, conversations, metaList, null, 1, 1);
        setStatus("Exportacao em lote concluida.");
      } catch (error) {
        console.error("[Exporter]", error);
        setStatus(error.message || "Falha na exportacao em lote.", true);
      }
    }
    function addStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        "#" + PANEL_ID + " { position: fixed; right: 18px; top: 72px; z-index: 2147483647; width: min(560px, calc(100vw - 36px)); max-height: calc(100vh - 104px); overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid rgba(128,128,128,.35); border-radius: 8px; background: var(--main-surface-primary, Canvas); color: var(--text-primary, CanvasText); box-shadow: 0 18px 60px rgba(0,0,0,.35); font: 13px system-ui, sans-serif; }",
        "#" + PANEL_ID + " h2 { margin: 0; font-size: 16px; font-weight: 700; }",
        "#" + PANEL_ID + " .codex-exporter-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }",
        "#" + PANEL_ID + " .codex-exporter-section { display: grid; gap: 8px; }",
        "#" + PANEL_ID + " .codex-exporter-grid { display: flex; flex-wrap: wrap; gap: 8px; }",
        "#" + PANEL_ID + " button { height: 32px; border: 1px solid rgba(128,128,128,.45); border-radius: 6px; padding: 0 10px; background: var(--button-secondary-background, transparent); color: inherit; cursor: pointer; }",
        "#" + PANEL_ID + " button.primary { background: #176b87; color: white; border-color: #176b87; }",
        "#" + PANEL_ID + " input[type='search'] { height: 32px; border: 1px solid rgba(128,128,128,.45); border-radius: 6px; padding: 0 10px; background: transparent; color: inherit; }",
        "#" + PANEL_ID + " .codex-exporter-list { min-height: 120px; max-height: 260px; overflow: auto; border: 1px solid rgba(128,128,128,.28); border-radius: 6px; }",
        "#" + PANEL_ID + " .codex-exporter-row { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 8px; padding: 7px 9px; border-bottom: 1px solid rgba(128,128,128,.16); }",
        "#" + PANEL_ID + " .codex-exporter-row small { opacity: .68; }",
        "#" + PANEL_ID + " .codex-exporter-status { min-height: 18px; opacity: .78; }",
        "#" + PANEL_ID + " .codex-exporter-status[data-error='true'] { color: #ff6b6b; opacity: 1; }"
      ].join("\\n");
      document.head.append(style);
    }
    function renderConversationList() {
      const list = document.querySelector("#" + PANEL_ID + " .codex-exporter-list");
      if (!list) return;
      const query = (document.querySelector("#" + PANEL_ID + " .codex-exporter-search")?.value || "").toLowerCase();
      const rows = loadedConversations.filter((item) => !query || (item.title || "").toLowerCase().includes(query));
      list.textContent = "";
      for (const item of rows) {
        const label = document.createElement("label");
        label.className = "codex-exporter-row";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = item.id;
        input.checked = true;
        const title = document.createElement("span");
        title.textContent = item.title || item.id;
        const date = document.createElement("small");
        date.textContent = item.update_time ? new Date(item.update_time * 1000).toLocaleDateString("pt-BR") : "";
        label.append(input, title, date);
        list.append(label);
      }
    }
    function makeButton(label, className, action) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (className) button.className = className;
      button.addEventListener("click", action);
      return button;
    }
    function showPanel() {
      addStyle();
      let panel = document.getElementById(PANEL_ID);
      if (panel) {
        panel.remove();
        return true;
      }
      panel = document.createElement("section");
      panel.id = PANEL_ID;
      panel.innerHTML = '<div class="codex-exporter-head"><h2>Exportador de conversas</h2></div><div class="codex-exporter-section codex-current"><strong>Conversa atual</strong><div class="codex-exporter-grid"></div></div><div class="codex-exporter-section codex-bulk"><strong>Todas as conversas</strong><div class="codex-exporter-grid codex-bulk-actions"></div><input class="codex-exporter-search" type="search" placeholder="Buscar nas conversas carregadas"><div class="codex-exporter-list"></div></div><div class="codex-exporter-status"></div>';
      panel.querySelector(".codex-exporter-head").append(makeButton("Fechar", "", () => panel.remove()));
      const current = panel.querySelector(".codex-current .codex-exporter-grid");
      current.append(
        makeButton("Copiar texto", "", () => runCurrent("text")),
        makeButton("Captura PNG", "", () => runCurrent("png")),
        makeButton("Markdown", "", () => runCurrent("markdown")),
        makeButton("HTML", "", () => runCurrent("html")),
        makeButton("JSON OpenAI", "", () => runCurrent("officialJson")),
        makeButton("Tavern JSONL", "", () => runCurrent("tavern")),
        makeButton("Ooba JSON", "", () => runCurrent("ooba"))
      );
      const bulk = panel.querySelector(".codex-bulk-actions");
      bulk.append(
        makeButton("Carregar conversas", "primary", loadConversations),
        makeButton("Selecionar tudo", "", () => {
          panel.querySelectorAll(".codex-exporter-row input").forEach((input) => { input.checked = true; });
        }),
        makeButton("Desmarcar", "", () => {
          panel.querySelectorAll(".codex-exporter-row input").forEach((input) => { input.checked = false; });
        }),
        makeButton("Markdown ZIP", "", () => runBulk("markdown")),
        makeButton("HTML ZIP", "", () => runBulk("html")),
        makeButton("JSON oficial", "", () => runBulk("officialJson")),
        makeButton("JSON ZIP", "", () => runBulk("jsonZip"))
      );
      panel.querySelector(".codex-exporter-search").addEventListener("input", renderConversationList);
      document.body.append(panel);
      return true;
    }
    window.__codexChatGptExporter = {
      isReady: true,
      showPanel,
      currentActions,
      loadConversations,
      runBulk
    };
  }
`;
}

function patchChatGptExporterUserscript(source) {
  const localeMarker = '\tvar LOCALES = [\n\t\tEN_US,';
  const languageMarker = '\tvar LanguageMapping = {\n\t\t"en": EN_US.code,';
  const fallbackMarker = 'return standardizeLanguage(storedLanguage) ?? standardizeLanguage(oaiLanguage) ?? standardizeLanguage(browserLanguage) ?? EN_US.code;';
  for (const marker of [localeMarker, languageMarker, fallbackMarker]) {
    if (!source.includes(marker)) throw new Error(`Exporter locale marker missing: ${marker}`);
  }
  return source
    .replace(localeMarker, `\tvar PT_BR = { name: "Portugues (Brasil)", code: "pt-BR", resource: ${JSON.stringify(CHATGPT_EXPORTER_PT_BR_TRANSLATION)} };\n${localeMarker.replace('EN_US,', 'PT_BR,\n\t\tEN_US,')}`)
    .replace(languageMarker, '\tvar LanguageMapping = {\n\t\t"pt": PT_BR.code,\n\t\t"pt-BR": PT_BR.code,\n\t\t"en": EN_US.code,')
    .replace(fallbackMarker, 'return PT_BR.code;');
}

function chatGptExporterBootstrapScript() {
  return `
(() => {
  if (window.__codexChatGptExporterLoaded) return;
  window.__codexChatGptExporterLoaded = "loading";
  window.unsafeWindow = window;
  const root = document.documentElement;
  const enforceDark = () => {
    if (root.getAttribute("data-theme") !== "dark") root.setAttribute("data-theme", "dark");
    if (root.classList.contains("light")) root.classList.remove("light");
    if (!root.classList.contains("dark")) root.classList.add("dark");
    if (root.style.colorScheme !== "dark") root.style.colorScheme = "dark";
  };
  enforceDark();
  new MutationObserver(enforceDark).observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  const prefix = "codex:chatgpt-exporter:";
  window.GM_getValue = (key, fallback = "") => {
    const item = window.localStorage.getItem(prefix + key);
    return item === null ? fallback : item;
  };
  window.GM_setValue = (key, value) => {
    window.localStorage.setItem(prefix + key, String(value));
  };
  window.GM_deleteValue = (key) => {
    window.localStorage.removeItem(prefix + key);
  };
  window.localStorage.setItem(prefix + "exporter:language", JSON.stringify("pt-BR"));
  window.localStorage.setItem(prefix + "exporter:export_all_limit", JSON.stringify(${CHATGPT_EXPORTER_ALL_LIMIT}));
})();
`;
}

function buildChatGptExporterInjectionScript() {
  if (chatGptExporterInjectionSource) {
    return chatGptExporterInjectionSource;
  }

  const jszipSource = readBundledTextFile('node_modules', 'jszip', 'dist', 'jszip.min.js');
  const captureSource = readBundledTextFile('node_modules', '@zumer', 'snapdom', 'dist', 'snapdom.js');
  const exporterSource = patchChatGptExporterUserscript(readBundledTextFile('chatgpt-exporter.user.js'));
  chatGptExporterInjectionSource = [
    chatGptExporterBootstrapScript(),
    jszipSource,
    captureSource,
    exporterSource,
    'window.__codexChatGptExporterLoaded = true;',
  ].join('\n;\n');
  return chatGptExporterInjectionSource;
}

async function injectChatGptExporter(win) {
  if (!win || win.isDestroyed()) {
    return false;
  }

  const url = win.webContents.getURL();
  if (!isChatGptPageUrl(url)) {
    return false;
  }

  try {
    return await win.webContents.executeJavaScript(`
      (() => {
        if (window.__codexChatGptExporterLoaded === true) return "already-loaded";
        return "load";
      })()
    `, true).then(async (state) => {
      if (state === 'already-loaded') {
        return true;
      }
      await win.webContents.executeJavaScript(buildChatGptExporterInjectionScript(), true);
      return true;
    });
  } catch (error) {
    console.warn(`[${SERVICE.id}] ChatGPT exporter injection failed`, error.message);
    return false;
  }
}

async function injectWorkspaceTools(win) {
  if (!win || win.isDestroyed() || !isChatGptPageUrl(win.webContents.getURL())) {
    return false;
  }
  try {
    await win.webContents.executeJavaScript(readBundledTextFile('workspace-tools.js'), true);
    return true;
  } catch (error) {
    console.warn(`[${SERVICE.id}] workspace tools injection failed`, error.message);
    return false;
  }
}

function openChatGptExporter() {
  const win = showMainWindow();
  const openScript = `
    (() => new Promise((resolve) => {
      let attempts = 0;
      const clickExporter = () => {
        const trigger = document.querySelector('[data-ce-original-export-menu] .ce-nav-trigger');
        if (trigger) {
          trigger.click();
          resolve(true);
          return;
        }
        attempts += 1;
        if (attempts > 30) {
          resolve(false);
          return;
        }
        setTimeout(clickExporter, 250);
      };
      clickExporter();
    }))()
  `;

  Promise.resolve(win.browserIdentityReady)
    .then(() => injectChatGptExporter(win))
    .then(() => win.webContents.executeJavaScript(openScript, true))
    .catch((error) => {
      console.warn(`[${SERVICE.id}] opening ChatGPT exporter failed`, error.message);
    });
}

function execFileOutput(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: options.timeout || 8000,
      maxBuffer: options.maxBuffer || 4 * 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

function optionalExecFileOutput(command, args, options = {}) {
  return execFileOutput(command, args, options).catch((error) => {
    console.warn(`[${SERVICE.id}] optional command failed: ${command} ${args.join(' ')}`, error.message);
    return '';
  });
}

function quoteDesktopExecArg(value) {
  return `"${String(value).replace(/(["\\$`])/g, '\\$1')}"`;
}

function currentAppImagePath() {
  const candidates = [
    process.env.CHATGPT_APPIMAGE_PATH,
    process.env.APPIMAGE,
    app.isPackaged ? process.execPath : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {}
  }

  return process.execPath;
}

function kdeDesktopDir() {
  return process.env.CHATGPT_KDE_DESKTOP_DIR
    || path.join(os.homedir(), '.local', 'share', 'applications');
}

function kdeShortcutsPath() {
  return process.env.CHATGPT_KDE_SHORTCUTS_FILE
    || path.join(os.homedir(), '.config', 'kglobalshortcutsrc');
}

function autostartDir() {
  return process.env.CHATGPT_AUTOSTART_DIR
    || path.join(os.homedir(), '.config', 'autostart');
}

function autostartDesktopPath() {
  return path.join(autostartDir(), 'chatgpt.desktop');
}

function kdeDesktopId() {
  if (process.env.CHATGPT_KDE_DESKTOP_ID) {
    return process.env.CHATGPT_KDE_DESKTOP_ID;
  }
  return 'chatgpt_app.desktop';
}

function isLegacyAppImageOverride(content) {
  return readDesktopValue(content, 'Name') === SERVICE.name
    && readDesktopValue(content, 'Exec').includes('chatgpt_app.appimage')
    && content.includes('[Desktop Action QuickAsk]');
}

function appExecWithSandbox(appImagePath) {
  return `${quoteDesktopExecArg(appImagePath)} --no-sandbox`;
}

function readDesktopValue(content, key) {
  const match = content.match(new RegExp(`^${key}=([^\\n]*)`, 'm'));
  return match ? match[1].trim() : '';
}

function stableDesktopIcon(appImagePath, existingIcon = '') {
  if (existingIcon && !existingIcon.startsWith('/tmp/.mount_')) return existingIcon;
  const appName = path.basename(appImagePath, path.extname(appImagePath));
  const managedIcon = path.join(path.dirname(appImagePath), '.icons', appName);
  return fs.existsSync(managedIcon) ? managedIcon : 'chatgpt';
}

function desktopEntryForShortcut(desktopId, appImagePath) {
  const desktopPath = path.join(kdeDesktopDir(), desktopId);
  let existing = '';
  try {
    existing = fs.readFileSync(desktopPath, 'utf8');
  } catch {}

  const existingIcon = readDesktopValue(existing, 'Icon');
  const icon = stableDesktopIcon(appImagePath, existingIcon);
  const appExec = appExecWithSandbox(appImagePath);

  return `[Desktop Entry]
Type=Application
Name=ChatGPT App
Comment=Linux desktop wrapper for ChatGPT with a configurable mini window.
TryExec=${appImagePath}
Exec=env DESKTOPINTEGRATION=1 ${appExec} %U
Icon=${icon}
Terminal=false
Categories=Network;Chat;
StartupWMClass=${SERVICE.desktopName}
Actions=QuickAsk;Preferences;
X-AppImage-Version=${app.getVersion()}
X-AppImage-Name=ChatGPT App

[Desktop Action QuickAsk]
Name=Abrir mini janela
Exec=env DESKTOPINTEGRATION=1 ${appExec} ${TOGGLE_MINI_ARG}
Icon=${icon}
X-KDE-Shortcuts=${QUICK_ASK_SHORTCUT}

[Desktop Action Preferences]
Name=Configurações
Exec=env DESKTOPINTEGRATION=1 ${appExec} ${PREFERENCES_ARG}
Icon=${icon}
X-KDE-Shortcuts=
`;
}

function autostartEntry(appImagePath) {
  const appExec = appExecWithSandbox(appImagePath);
  const icon = stableDesktopIcon(appImagePath, readDesktopValue(safeReadFile(path.join(kdeDesktopDir(), kdeDesktopId())), 'Icon'));
  const autostartArg = settings.autoStartToTray ? START_MINIMIZED_ARG : '';

  return `[Desktop Entry]
Type=Application
Name=ChatGPT App
Comment=Iniciar o ChatGPT com a sessão do sistema
Exec=env DESKTOPINTEGRATION=1 ${appExec}${autostartArg ? ` ${autostartArg}` : ''}
Icon=${icon}
Terminal=false
Categories=Network;Chat;
StartupWMClass=${SERVICE.desktopName}
X-GNOME-Autostart-enabled=true
`;
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function writeFileIfChanged(filePath, content) {
  const current = safeReadFile(filePath);
  if (current === content) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

function shortcutValueHasAltSpace(value) {
  return String(value || '')
    .split(',')
    .slice(0, 2)
    .some((part) => part.split('\t').map((item) => item.trim()).includes(QUICK_ASK_SHORTCUT));
}

function findShortcutConflict(content, desktopId) {
  let currentSection = '';
  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    if (!shortcutValueHasAltSpace(line)) {
      continue;
    }

    const key = line.split('=', 1)[0];
    if (currentSection === `services][${desktopId}` && key === QUICK_ASK_DESKTOP_ACTION) {
      continue;
    }
    if (currentSection === 'services][chatgpt-quickask.desktop') {
      continue;
    }

    return { section: currentSection, key, line };
  }

  return null;
}

function setIniSectionKeys(content, section, values) {
  const lines = content ? content.replace(/\s+$/u, '').split(/\r?\n/) : [];
  const sectionHeader = `[${section}]`;
  let start = lines.findIndex((line) => line.trim() === sectionHeader);

  if (start === -1) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(sectionHeader);
    start = lines.length - 1;
  }

  let end = start + 1;
  while (end < lines.length && !/^\[.+]$/.test(lines[end].trim())) {
    end += 1;
  }

  const keys = new Set(Object.keys(values));
  const kept = lines.slice(start + 1, end).filter((line) => {
    const key = line.split('=', 1)[0].trim();
    return !keys.has(key);
  });

  const replacement = [
    sectionHeader,
    ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    ...kept,
  ];

  return [
    ...lines.slice(0, start),
    ...replacement,
    ...lines.slice(end),
  ].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function removeIniSection(content, section) {
  if (!content) {
    return '';
  }

  const lines = content.replace(/\s+$/u, '').split(/\r?\n/);
  const sectionHeader = `[${section}]`;
  const start = lines.findIndex((line) => line.trim() === sectionHeader);
  if (start === -1) {
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  let end = start + 1;
  while (end < lines.length && !/^\[.+]$/.test(lines[end].trim())) {
    end += 1;
  }

  return [
    ...lines.slice(0, start),
    ...lines.slice(end),
  ].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function removeOwnLegacyShortcut(content) {
  const section = 'services][chatgpt.desktop';
  const header = `[${section}]`;
  const start = content.split(/\r?\n/).indexOf(header);
  if (start < 0) return content;

  const lines = content.split(/\r?\n/);
  const endOffset = lines.slice(start + 1).findIndex((line) => /^\[.+]$/.test(line));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  const entries = lines.slice(start + 1, end);
  if (!entries.includes('_launch=none,none,ChatGPT App')
    || !entries.some((line) => line.startsWith('QuickAsk=') && shortcutValueHasAltSpace(line))) {
    return content;
  }

  const ownKeys = new Set(['QuickAsk', 'Preferences', '_launch']);
  const preserved = entries.filter((line) => !ownKeys.has(line.split('=', 1)[0]));
  return preserved.some((line) => line.trim())
    ? [...lines.slice(0, start + 1), ...preserved, ...lines.slice(end)].join('\n')
    : removeIniSection(content, section);
}

function backupFileIfExists(filePath) {
  if (!fs.existsSync(filePath) || process.env.CHATGPT_SKIP_CONFIG_BACKUP === '1') {
    return null;
  }

  const backupPath = `${filePath}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function backupIfChanging(filePath, nextContent) {
  if (safeReadFile(filePath) === nextContent) {
    return null;
  }

  return backupFileIfExists(filePath);
}

function legacyDesktopPath() {
  return path.join(kdeDesktopDir(), 'chatgpt_app.desktop');
}

function disableLegacyDesktopEntry(primaryDesktopId) {
  if (primaryDesktopId === 'chatgpt_app.desktop' || process.env.CHATGPT_KEEP_LEGACY_DESKTOP === '1') {
    return null;
  }

  const legacyPath = legacyDesktopPath();
  if (!fs.existsSync(legacyPath)) {
    return null;
  }

  const backup = backupFileIfExists(legacyPath);
  fs.unlinkSync(legacyPath);
  return { path: legacyPath, backup };
}

function removeQuickAskDesktopEntry() {
  const filePath = path.join(kdeDesktopDir(), 'chatgpt-quickask.desktop');
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const backup = backupFileIfExists(filePath);
  fs.unlinkSync(filePath);
  return { path: filePath, backup };
}

async function runKdeShortcutRefresh(desktopId, migratedLegacyShortcut = false) {
  if (process.env.CHATGPT_SKIP_KDE_DBUS === '1') {
    return {
      refreshed: false,
      reason: 'CHATGPT_SKIP_KDE_DBUS=1',
    };
  }

  await execFileOutput('kbuildsycoca6', [], { timeout: 15000 });

  if (migratedLegacyShortcut) {
    await execFileOutput('busctl', [
      '--user', 'call', 'org.kde.kglobalaccel', '/kglobalaccel',
      'org.kde.KGlobalAccel', 'unregister', 'ss', 'chatgpt.desktop', QUICK_ASK_DESKTOP_ACTION,
    ]);
  }

  await optionalExecFileOutput('busctl', [
    '--user',
    'call',
    'org.kde.kglobalaccel',
    '/kglobalaccel',
    'org.kde.KGlobalAccel',
    'setForeignShortcut',
    'asai',
    '4',
    'chatgpt-quickask.desktop',
    '_launch',
    'ChatGPT Quick Ask',
    'ChatGPT Quick Ask',
    '0',
  ]);

  await execFileOutput('busctl', [
    '--user', 'call', 'org.kde.kglobalaccel', '/kglobalaccel',
    'org.kde.KGlobalAccel', 'doRegister', 'as', '4',
    desktopId, QUICK_ASK_DESKTOP_ACTION, SERVICE.name, 'Abrir mini janela',
  ]);
  const assigned = await execFileOutput('busctl', [
    '--user',
    'call',
    'org.kde.kglobalaccel',
    '/kglobalaccel',
    'org.kde.KGlobalAccel',
    'setShortcut',
    'asaiu',
    '4',
    desktopId,
    QUICK_ASK_DESKTOP_ACTION,
    SERVICE.name,
    'Abrir mini janela',
    '1',
    String(QUICK_ASK_QT_KEY),
    '0',
  ]);
  if (!assigned.includes(`ai 1 ${QUICK_ASK_QT_KEY}`)) {
    throw new Error(`${QUICK_ASK_SHORTCUT} was not accepted by KDE: ${assigned.trim()}`);
  }
  const active = await execFileOutput('busctl', [
    '--user', 'call', 'org.kde.kglobalaccel', '/kglobalaccel',
    'org.kde.KGlobalAccel', 'getGlobalShortcutsByKey', 'i', String(QUICK_ASK_QT_KEY),
  ]);
  if (!active.includes(`"${desktopId}"`) || !active.includes(`"${QUICK_ASK_DESKTOP_ACTION}"`)) {
    throw new Error(`${QUICK_ASK_SHORTCUT} is not active for ${desktopId}: ${active.trim()}`);
  }

  return { refreshed: true, active: true };
}

function kdeShortcutContentWithQuickAsk(shortcutsContent, desktopId) {
  const mainSection = `services][${desktopId}`;
  const withoutOldQuickAskDesktop = removeIniSection(shortcutsContent, 'services][chatgpt-quickask.desktop');
  const migrated = desktopId === 'chatgpt_app.desktop'
    ? removeOwnLegacyShortcut(withoutOldQuickAskDesktop)
    : withoutOldQuickAskDesktop;
  return setIniSectionKeys(migrated, mainSection, {
    [QUICK_ASK_DESKTOP_ACTION]: `${QUICK_ASK_SHORTCUT},${QUICK_ASK_SHORTCUT},Abrir mini janela`,
    Preferences: 'none,none,Preferencias',
    _launch: `none,none,${SERVICE.name}`,
  });
}

async function installKdeQuickAskShortcut(options = {}) {
  const desktopId = options.desktopId || kdeDesktopId();
  const desktopDir = kdeDesktopDir();
  const shortcutsPath = kdeShortcutsPath();
  const appImagePath = options.appImagePath || currentAppImagePath();
  const desktopPath = path.join(desktopDir, desktopId);

  fs.mkdirSync(desktopDir, { recursive: true });
  fs.mkdirSync(path.dirname(shortcutsPath), { recursive: true });

  let shortcutsContent = '';
  try {
    shortcutsContent = fs.readFileSync(shortcutsPath, 'utf8');
  } catch {}

  const withoutOldQuickAsk = removeIniSection(shortcutsContent, 'services][chatgpt-quickask.desktop');
  const withoutOwnLegacy = desktopId === 'chatgpt_app.desktop'
    ? removeOwnLegacyShortcut(withoutOldQuickAsk)
    : withoutOldQuickAsk;
  const migratedLegacyShortcut = desktopId === 'chatgpt_app.desktop'
    && withoutOwnLegacy !== withoutOldQuickAsk;
  const conflict = findShortcutConflict(withoutOwnLegacy, desktopId);
  if (conflict && !options.force) {
    throw new Error(`${QUICK_ASK_SHORTCUT} ja esta usado por [${conflict.section}] ${conflict.key}.`);
  }

  const desktopContent = desktopEntryForShortcut(desktopId, appImagePath);
  const desktopBackup = backupIfChanging(desktopPath, desktopContent);
  const shortcutsBackup = backupIfChanging(shortcutsPath, kdeShortcutContentWithQuickAsk(shortcutsContent, desktopId));
  const legacyDesktop = disableLegacyDesktopEntry(desktopId);
  const removedQuickAskDesktop = removeQuickAskDesktopEntry();
  const oldDesktopPath = path.join(desktopDir, 'chatgpt.desktop');
  const oldDesktopContent = safeReadFile(oldDesktopPath);
  const removeOldDesktop = desktopId === 'chatgpt_app.desktop' && isLegacyAppImageOverride(oldDesktopContent);
  const oldDesktopBackup = removeOldDesktop ? backupFileIfExists(oldDesktopPath) : null;
  if (removeOldDesktop) fs.unlinkSync(oldDesktopPath);
  writeFileIfChanged(desktopPath, desktopContent);

  const updatedShortcuts = kdeShortcutContentWithQuickAsk(shortcutsContent, desktopId);
  writeFileIfChanged(shortcutsPath, updatedShortcuts);

  const refresh = await runKdeShortcutRefresh(desktopId, migratedLegacyShortcut);
  const finalShortcuts = kdeShortcutContentWithQuickAsk(safeReadFile(shortcutsPath), desktopId);
  writeFileIfChanged(shortcutsPath, finalShortcuts);

  return {
    ok: true,
    desktopId,
    desktopPath,
    appImagePath,
    shortcutsPath,
    shortcut: QUICK_ASK_SHORTCUT,
    desktopBackup,
    shortcutsBackup,
    legacyDesktop,
    oldDesktopBackup,
    removedQuickAskDesktop,
    ...refresh,
  };
}

function applyAutostartSetting() {
  const filePath = autostartDesktopPath();
  if (!settings.autoStart) {
    if (fs.existsSync(filePath)) {
      const backup = backupFileIfExists(filePath);
      fs.unlinkSync(filePath);
      return { enabled: false, path: filePath, backup };
    }

    return { enabled: false, path: filePath };
  }

  const appImagePath = currentAppImagePath();
  const content = autostartEntry(appImagePath);
  const backup = backupIfChanging(filePath, content);
  writeFileIfChanged(filePath, content);
  return {
    enabled: true,
    startToTray: Boolean(settings.autoStartToTray),
    path: filePath,
    appImagePath,
    backup,
  };
}

async function syncDesktopIntegrationOnStart() {
  try {
    applyAutostartSetting();
  } catch (error) {
    console.warn(`[${SERVICE.id}] autostart sync failed`, error.message);
  }

  if (!settings.repairKdeShortcutOnStart) {
    return;
  }

  try {
    await installKdeQuickAskShortcut();
  } catch (error) {
    console.warn(`[${SERVICE.id}] KDE shortcut auto-repair failed`, error.message);
  }
}

function uniqueExistingFiles(paths) {
  const seen = new Set();
  return paths.filter((candidate) => {
    if (!candidate || seen.has(candidate)) {
      return false;
    }
    seen.add(candidate);
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

function cookieDatabaseCandidates() {
  const candidates = [];
  const envCandidate = process.env[EXTERNAL_COOKIE_IMPORT_ENV] || '';

  const profileRoots = [
    path.join(os.homedir(), '.config', 'zen'),
    path.join(os.homedir(), '.mozilla', 'firefox'),
    path.join(os.homedir(), '.librewolf'),
    path.join(os.homedir(), '.waterfox'),
  ];

  for (const root of profileRoots) {
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        candidates.push(path.join(root, entry.name, 'cookies.sqlite'));
      }
    }
  }

  const sortedCandidates = uniqueExistingFiles(candidates)
    .map((candidate) => ({
      path: candidate,
      mtimeMs: Math.max(
        fs.statSync(candidate).mtimeMs,
        ...['-wal', '-shm'].map((suffix) => {
          try {
            return fs.statSync(`${candidate}${suffix}`).mtimeMs;
          } catch {
            return 0;
          }
        }),
      ),
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map((candidate) => candidate.path);

  return uniqueExistingFiles([
    envCandidate,
    ...sortedCandidates.filter((candidate) => candidate !== envCandidate),
  ]);
}

function cookieReaderScript() {
  return `
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import time

db_path = sys.argv[1]
domains = json.loads(sys.argv[2])

def host_matches(host, domain):
    normalized = (host or '').lstrip('.').lower()
    return normalized == domain or normalized.endswith('.' + domain)

def normalized_expiry(value):
    expiry = int(value or 0)
    if expiry > 100000000000:
        expiry = expiry // 1000
    return expiry

try:
    if not os.path.exists(db_path):
        print(json.dumps({'cookies': [], 'error': 'cookie database not found'}))
        sys.exit(0)

    with tempfile.TemporaryDirectory(prefix='chatgpt-cookie-snapshot-') as snapshot_dir:
        snapshot_path = os.path.join(snapshot_dir, 'cookies.sqlite')
        shutil.copy2(db_path, snapshot_path)
        for suffix in ('-wal', '-shm'):
            source_sidecar = db_path + suffix
            if os.path.exists(source_sidecar):
                shutil.copy2(source_sidecar, snapshot_path + suffix)
        conn = sqlite3.connect(snapshot_path, timeout=2.5)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            'select host, name, value, path, expiry, isSecure, isHttpOnly, sameSite from moz_cookies'
        ).fetchall()
        conn.close()
    cookies = []
    now = int(time.time())
    for row in rows:
        host = (row['host'] or '').lower()
        if not any(host_matches(host, domain) for domain in domains):
            continue
        expiry = normalized_expiry(row['expiry'])
        if expiry and expiry < now:
            continue
        cookies.append({
            'host': host,
            'name': row['name'] or '',
            'value': row['value'] or '',
            'path': row['path'] or '/',
            'expiry': expiry,
            'secure': bool(row['isSecure']),
            'httpOnly': bool(row['isHttpOnly']),
            'sameSite': int(row['sameSite'] or 0),
        })
    print(json.dumps({'cookies': cookies}))
except Exception as exc:
    print(json.dumps({'cookies': [], 'error': str(exc)}))
`;
}

async function readCookiesFromDatabase(dbPath) {
  const args = ['-c', cookieReaderScript(), dbPath, JSON.stringify(EXTERNAL_COOKIE_DOMAINS)];
  let lastError = null;
  for (const command of ['python3', 'python']) {
    try {
      const output = await execFileOutput(command, args);
      const parsed = JSON.parse(output || '{}');
      return {
        source: dbPath,
        cookies: Array.isArray(parsed.cookies) ? parsed.cookies : [],
        error: parsed.error || null,
      };
    } catch (error) {
      lastError = error;
      if (error.code !== 'ENOENT') {
        break;
      }
    }
  }

  throw lastError || new Error('Python is not available for cookie import.');
}

async function readExternalBrowserCookies() {
  const databases = cookieDatabaseCandidates();
  let lastError = null;
  let emptyResult = null;

  for (const dbPath of databases) {
    try {
      const result = await readCookiesFromDatabase(dbPath);
      if (result.cookies.length > 0) {
        return result;
      }
      if (!result.error && !emptyResult) {
        emptyResult = result;
      } else if (result.error) {
        lastError = new Error(result.error);
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (emptyResult) {
    return emptyResult;
  }

  return {
    source: databases[0] || null,
    cookies: [],
    error: lastError ? lastError.message : 'No Firefox or Zen cookie database was found.',
  };
}

function firefoxSameSiteToElectron(value, secure) {
  switch (Number(value)) {
    case 0:
      return secure ? 'no_restriction' : 'unspecified';
    case 1:
      return 'lax';
    case 2:
      return 'strict';
    default:
      return 'unspecified';
  }
}

function cookieImportSignature(source, cookies) {
  if (!cookies.length) {
    return '';
  }

  const fingerprint = [
    source || '',
    ...cookies
      .map((cookie) => [
        cookie.host,
        cookie.name,
        cookie.path,
        cookie.expiry,
        cookie.value || '',
      ].join(':'))
      .sort(),
  ].join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

function looksLikeSessionCookie(cookie) {
  return /(session|auth|access[_-]?token|refresh[_-]?token)/i.test(cookie.name || '');
}

function normalizeCookieExpiration(value) {
  let expiry = Number(value);
  if (!Number.isFinite(expiry) || expiry <= 0) {
    return 0;
  }

  if (expiry > 100000000000) {
    expiry = Math.floor(expiry / 1000);
  }

  return Math.floor(expiry);
}

function cookieIsExpired(cookie) {
  const expiry = normalizeCookieExpiration(cookie && cookie.expiry);
  return Boolean(expiry && expiry <= Math.floor(Date.now() / 1000));
}

function cookieUrlFromParts(host, cookiePath = '/', secure = true) {
  const urlHost = String(host || '').trim().toLowerCase().replace(/^\./, '');
  return `${secure ? 'https' : 'http'}://${urlHost}${cookiePath || '/'}`;
}

async function setElectronCookie(cookie) {
  const host = String(cookie.host || '').trim().toLowerCase();
  const urlHost = host.replace(/^\./, '');
  if (!host || !urlHost || !cookie.name) {
    return false;
  }

  if (cookieIsExpired(cookie)) {
    return false;
  }

  const details = {
    url: cookieUrlFromParts(host, cookie.path, cookie.secure),
    name: cookie.name,
    value: String(cookie.value || ''),
    path: cookie.path || '/',
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
  };

  if (host.startsWith('.')) {
    details.domain = host;
  }

  const expiry = normalizeCookieExpiration(cookie.expiry);
  if (expiry > 0) {
    details.expirationDate = expiry;
  }

  const sameSite = firefoxSameSiteToElectron(cookie.sameSite, cookie.secure);
  if (sameSite !== 'unspecified') {
    details.sameSite = sameSite;
  }

  await appSession.cookies.set(details);
  return true;
}

async function clearElectronCookiesForExternalDomains() {
  const cookies = await appSession.cookies.get({});
  let removed = 0;

  for (const cookie of cookies) {
    const host = String(cookie.domain || '').toLowerCase();
    if (!EXTERNAL_COOKIE_DOMAINS.some((domain) => hostMatches(host.replace(/^\./, ''), domain))) {
      continue;
    }

    try {
      await appSession.cookies.remove(cookieUrlFromParts(host, cookie.path, cookie.secure), cookie.name);
      removed += 1;
    } catch (error) {
      console.warn(`[${SERVICE.id}] stale cookie cleanup skipped ${cookie.name || ''}`, error.message);
    }
  }

  return removed;
}

async function electronSessionHasSessionCookies() {
  const cookies = [
    ...await appSession.cookies.get({ url: SERVICE.startUrl }),
    ...await appSession.cookies.get({ url: 'https://auth.openai.com/' }),
  ];
  return cookies.some((cookie) => looksLikeSessionCookie({
    name: cookie.name,
  }) && (!cookie.expirationDate || cookie.expirationDate > Date.now() / 1000));
}

async function bootstrapExternalBrowserSessionOnStart() {
  if (TEST_MODE) {
    return null;
  }

  try {
    if (await electronSessionHasSessionCookies()) {
      return { skipped: true, reason: 'electron-session-present' };
    }

    const result = await importExternalBrowserSession({
      reload: false,
      onlyOnChange: false,
      requireSessionCookie: true,
      skipIfElectronSessionPresent: true,
    });
    if (result.imported > 0) {
      console.log(`[${SERVICE.id}] bootstrapped ${result.imported} external browser cookies from ${result.source}`);
    }
    return result;
  } catch (error) {
    console.warn(`[${SERVICE.id}] startup browser session bootstrap failed`, error.message);
    return { ok: false, error: error.message };
  }
}

function preservedChatReloadUrl(currentUrl) {
  if (isHttpUrl(currentUrl) && isTrustedUrl(currentUrl)) {
    return currentUrl;
  }
  return SERVICE.startUrl;
}

async function reloadChatWindowsAfterCookieImport(options = {}) {
  const { onlyLoggedOut = false } = options;
  for (const win of [mainWindow, miniWindow]) {
    if (!win || win.isDestroyed()) {
      continue;
    }

    if (onlyLoggedOut && !(await pageLooksLoggedOutOrExpired(win))) {
      continue;
    }

    const reloadUrl = preservedChatReloadUrl(win.webContents.getURL());
    await Promise.resolve(win.browserIdentityReady).catch(() => {});
    await win.loadURL(reloadUrl).catch((error) => {
      console.warn(`[${SERVICE.id}] reload after browser session import failed`, error.message);
    });
  }
}

async function importExternalBrowserSession(options = {}) {
  const {
    reload = false,
    reloadOnlyLoggedOut = false,
    onlyOnChange = false,
    replaceExisting = false,
    requireSessionCookie = false,
    skipIfElectronSessionPresent = false,
  } = options;

  if (skipIfElectronSessionPresent && await electronSessionHasSessionCookies()) {
    return {
      ok: true,
      skipped: true,
      reason: 'electron-session-present',
      source: null,
      candidateCookies: 0,
      imported: 0,
      removedStaleCookies: 0,
      sessionLikeCookies: 0,
      error: null,
    };
  }

  const result = await readExternalBrowserCookies();
  result.cookies = result.cookies.filter((cookie) => !cookieIsExpired(cookie));
  const signature = cookieImportSignature(result.source, result.cookies);
  const sessionLikeCookies = result.cookies.filter(looksLikeSessionCookie);

  if (onlyOnChange && (!signature || signature === externalBrowserCookieSignature)) {
    return {
      ok: true,
      changed: false,
      source: result.source,
      candidateCookies: result.cookies.length,
      imported: 0,
      sessionLikeCookies: sessionLikeCookies.length,
      error: result.error || null,
    };
  }

  if (requireSessionCookie && sessionLikeCookies.length === 0) {
    return {
      ok: false,
      changed: Boolean(signature),
      source: result.source,
      candidateCookies: result.cookies.length,
      imported: 0,
      removedStaleCookies: 0,
      sessionLikeCookies: 0,
      error: result.error || 'No external browser session cookies were found.',
    };
  }

  let imported = 0;
  let removedStaleCookies = 0;
  if (replaceExisting && result.cookies.length > 0) {
    removedStaleCookies = await clearElectronCookiesForExternalDomains();
  }

  for (const cookie of result.cookies) {
    try {
      if (await setElectronCookie(cookie)) {
        imported += 1;
      }
    } catch (error) {
      console.warn(`[${SERVICE.id}] cookie import skipped ${cookie.host || ''} ${cookie.name || ''}`, error.message);
    }
  }

  if (signature) {
    externalBrowserCookieSignature = signature;
  }

  if (imported > 0) {
    await flushPersistentSessionData('external-browser-cookie-import');
  }

  if (reload && imported > 0) {
    await reloadChatWindowsAfterCookieImport({ onlyLoggedOut: reloadOnlyLoggedOut });
  }

  return {
    ok: imported > 0,
    changed: Boolean(signature),
    source: result.source,
    candidateCookies: result.cookies.length,
    imported,
    removedStaleCookies,
    sessionLikeCookies: sessionLikeCookies.length,
    error: imported > 0 ? null : result.error || 'No ChatGPT/OpenAI cookies were found in the external browser profile.',
  };
}

function stopExternalBrowserSessionImport() {
  if (externalBrowserImportTimer) {
    clearInterval(externalBrowserImportTimer);
    externalBrowserImportTimer = null;
  }
}

function scheduleExternalBrowserSessionImport(options = {}) {
  const {
    replaceExisting = false,
  } = options;

  if (SMOKE_MODE) {
    return;
  }

  externalBrowserImportDeadline = Date.now() + EXTERNAL_COOKIE_IMPORT_WINDOW_MS;
  if (externalBrowserImportTimer) {
    return;
  }

  const tick = async () => {
    if (Date.now() > externalBrowserImportDeadline) {
      stopExternalBrowserSessionImport();
      return;
    }

    if (externalBrowserImportInFlight) {
      return;
    }

    externalBrowserImportInFlight = true;
    try {
      const result = await importExternalBrowserSession({
        reload: true,
        reloadOnlyLoggedOut: true,
        onlyOnChange: true,
        replaceExisting,
        skipIfElectronSessionPresent: !replaceExisting,
      });
      if (result.imported > 0) {
        console.log(`[${SERVICE.id}] imported ${result.imported} external browser cookies from ${result.source}`);
        stopExternalBrowserSessionImport();
      } else if (result.error && !externalBrowserImportWarned) {
        externalBrowserImportWarned = true;
        console.warn(`[${SERVICE.id}] external browser session import waiting`, result.error);
      }
    } catch (error) {
      if (!externalBrowserImportWarned) {
        externalBrowserImportWarned = true;
        console.warn(`[${SERVICE.id}] external browser session import failed`, error.message);
      }
    } finally {
      externalBrowserImportInFlight = false;
    }
  };

  setTimeout(tick, EXTERNAL_COOKIE_IMPORT_INTERVAL_MS);
  externalBrowserImportTimer = setInterval(tick, EXTERNAL_COOKIE_IMPORT_INTERVAL_MS);
}

function permissionAllowed(requestingUrl, permission) {
  return TRUSTED_PERMISSIONS.has(permission) && isTrustedUrl(requestingUrl);
}

function configureSession() {
  appSession = session.fromPartition(SERVICE.partition, { cache: true });
  appSession.setUserAgent(chromeUserAgent(), DEFAULT_ACCEPT_LANGUAGE);
  appSession.cookies.on('changed', () => {
    schedulePersistentSessionFlush('cookie-change');
  });

  appSession.webRequest.onBeforeRequest((details, callback) => {
    const isFrameNavigation = details.resourceType === 'mainFrame' || details.resourceType === 'subFrame';
    if (isFrameNavigation && shouldOpenExternally(details.url)) {
      openExternalUrl(details.url).catch((error) => {
        console.warn(`[${SERVICE.id}] external login open failed`, error.message);
      });
      callback({ cancel: true });
      return;
    }

    callback({});
  });

  appSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    requestHeaders['User-Agent'] = chromeUserAgent();
    requestHeaders['Accept-Language'] = DEFAULT_ACCEPT_LANGUAGE;
    requestHeaders['Sec-CH-UA'] = chromeClientHints();
    requestHeaders['Sec-CH-UA-Full-Version-List'] = chromeFullVersionList();
    requestHeaders['Sec-CH-UA-Mobile'] = '?0';
    requestHeaders['Sec-CH-UA-Platform'] = '"Linux"';
    requestHeaders['Sec-CH-UA-Platform-Version'] = '"6.0.0"';
    requestHeaders['Sec-CH-UA-Arch'] = '"x86"';
    requestHeaders['Sec-CH-UA-Bitness'] = '"64"';
    callback({ requestHeaders });
  });

  appSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const requestingUrl = details.requestingUrl || webContents.getURL();
    callback(permissionAllowed(requestingUrl, permission));
  });

  appSession.setPermissionCheckHandler((webContents, permission, requestingOrigin = '') => {
    const requestingUrl = requestingOrigin || webContents.getURL();
    return permissionAllowed(requestingUrl, permission);
  });
}

function baseWebPreferences() {
  return {
    partition: SERVICE.partition,
    backgroundThrottling: Boolean(settings.backgroundEfficiency),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    spellcheck: true,
    plugins: true,
  };
}

function iconPath() {
  return path.join(__dirname, SERVICE.icon);
}

function browserWindowIcon() {
  const image = nativeImage.createFromPath(iconPath());
  return image.isEmpty() ? undefined : image;
}

function createTrustedPopup(url) {
  const childWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 640,
    minHeight: 540,
    title: `${SERVICE.name} Sign In`,
    icon: browserWindowIcon(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: baseWebPreferences(),
  });

  childWindow.chatContentWindow = true;
  configureWebContents(childWindow);
  childWindow.once('ready-to-show', () => {
    if (!childWindow.isDestroyed()) {
      childWindow.show();
      childWindow.focus();
    }
  });
  Promise.resolve(childWindow.browserIdentityReady)
    .then(() => {
      if (!childWindow.isDestroyed()) {
        return childWindow.loadURL(url);
      }
      return null;
    })
    .catch((error) => {
      console.warn(`[${SERVICE.id}] popup load failed`, error.message);
    });
  return childWindow;
}

function configureWebContents(win) {
  win.chatContentWindow = true;
  win.webContents.setUserAgent(chromeUserAgent());
  applyZoomToWebContents(win.webContents);
  win.browserIdentityReady = applyBrowserIdentity(win.webContents);
  win.webContents.on('dom-ready', () => {
    applyZoomToWebContents(win.webContents);
    win.webContents.executeJavaScript(browserIdentityScript(), true).catch(() => {});
    injectChatGptExporter(win).catch(() => {});
    injectWorkspaceTools(win).catch(() => {});
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (!(input.control || input.meta) || input.type !== 'keyDown') {
      return;
    }

    if (input.key === '+' || input.key === '=') {
      adjustZoom(ZOOM_STEP);
      event.preventDefault();
    } else if (input.key === '-' || input.key === '_') {
      adjustZoom(-ZOOM_STEP);
      event.preventDefault();
    } else if (input.key === '0') {
      resetZoom();
      event.preventDefault();
    }
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (shouldOpenExternally(url)) {
      event.preventDefault();
      openExternalUrl(url).catch((error) => {
        console.warn(`[${SERVICE.id}] external login open failed`, error.message);
      });
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenExternally(url)) {
      openExternalUrl(url).catch((error) => {
        console.warn(`[${SERVICE.id}] external login open failed`, error.message);
      });
      return { action: 'deny' };
    }

    if (isTrustedUrl(url)) {
      createTrustedPopup(url);
      return { action: 'deny' };
    }

    if (isHttpUrl(url)) {
      openExternalUrl(url).catch((error) => {
        console.warn(`[${SERVICE.id}] external URL open failed`, error.message);
      });
    }
    return { action: 'deny' };
  });

  win.webContents.on('did-create-window', (childWindow) => {
    configureWebContents(childWindow);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    if (errorCode !== -3) {
      console.warn(`[${SERVICE.id}] load failed`, errorCode, errorDescription, validatedUrl);
    }
  });
}

function restoreBounds(options, bounds) {
  if (!bounds) {
    return options;
  }

  return {
    ...options,
    x: Number.isInteger(bounds.x) ? bounds.x : options.x,
    y: Number.isInteger(bounds.y) ? bounds.y : options.y,
    width: Number.isInteger(bounds.width) ? bounds.width : options.width,
    height: Number.isInteger(bounds.height) ? bounds.height : options.height,
  };
}

function rememberWindowBounds(kind, win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  if (kind === 'mini') {
    return;
  }

  settings[`${kind}Bounds`] = win.getBounds();
  writeSettings();
}

function displayForMiniWindow() {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    return screen.getDisplayMatching(mainWindow.getBounds());
  }

  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow && !focusedWindow.isDestroyed()) {
    return screen.getDisplayMatching(focusedWindow.getBounds());
  }

  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function positionMiniWindowBottomCenter(win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  const display = displayForMiniWindow();
  const width = Math.min(MINI_WINDOW_WIDTH, Math.max(320, display.workArea.width - 24));
  const height = Math.min(MINI_WINDOW_HEIGHT, Math.max(420, display.workArea.height - 24));
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2);
  const y = Math.round(display.workArea.y + display.workArea.height - height - MINI_WINDOW_BOTTOM_MARGIN);
  const nextBounds = {
    x,
    y: Math.max(display.workArea.y, y),
    width,
    height,
  };
  win.setBounds(nextBounds);
  win.setSize(nextBounds.width, nextBounds.height);
  win.setPosition(nextBounds.x, nextBounds.y);
}

function pinMiniWindow(win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  win.setSkipTaskbar(true);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(Boolean(settings.miniAlwaysOnTop), 'screen-saver', 1);
  if (settings.miniAlwaysOnTop) {
    win.moveTop();
  }
}

function reinforceMiniWindowPin(win) {
  pinMiniWindow(win);
  setTimeout(() => pinMiniWindow(win), 200);
  setTimeout(() => pinMiniWindow(win), 900);
}

function reinforceMiniWindowPlacement(win) {
  positionMiniWindowBottomCenter(win);
  for (const delay of [120, 450, 1000, 1800, 2800, 4200]) {
    setTimeout(() => positionMiniWindowBottomCenter(win), delay);
  }
}

async function pageLooksSignedIn(win) {
  if (!win || win.isDestroyed()) {
    return false;
  }

  try {
    return await win.webContents.executeJavaScript(`
      (() => {
        const text = (document.body && document.body.innerText || '').replace(/\\s+/g, ' ');
        const hasLoginPrompt = /\\b(Log in|Sign up|Continue with Google|Email or phone|Entrar|Criar conta)\\b/i.test(text);
        const hasChatShell = /(New chat|Novo chat|Buscar chats|Biblioteca|Pergunte alguma coisa|Message ChatGPT|ChatGPT Plus)/i.test(text);
        return Boolean(hasChatShell && !hasLoginPrompt);
      })()
    `, true);
  } catch {
    return false;
  }
}

async function pageLooksLoggedOutOrExpired(win) {
  if (!win || win.isDestroyed()) {
    return false;
  }

  try {
    return await win.webContents.executeJavaScript(`
      (() => {
        const text = (document.body && document.body.innerText || '').replace(/\\s+/g, ' ');
        return /\\b(Log in|Sign up|Continue with Google|Email or phone|Entrar|Criar conta|Entre novamente|Sua sessão expirou|sessão expirou|session expired|sign in again)\\b/i.test(text);
      })()
    `, true);
  } catch {
    return false;
  }
}

function watchForSessionRepair(win) {
  if (TEST_MODE || !settings.automaticSessionRepair || !win || win.isDestroyed()) {
    return;
  }

  const attemptRepair = async () => {
    if (sessionRepairAttempted || !win || win.isDestroyed()) {
      return;
    }

    if (!(await pageLooksLoggedOutOrExpired(win))) {
      return;
    }

    sessionRepairAttempted = true;
    try {
      const result = await importExternalBrowserSession({
        reload: true,
        reloadOnlyLoggedOut: true,
        onlyOnChange: false,
        replaceExisting: true,
        requireSessionCookie: true,
        skipIfElectronSessionPresent: false,
      });
      if (result.imported > 0) {
        console.log(`[${SERVICE.id}] restored ${result.imported} browser session cookies from ${result.source}`);
      } else if (result.error) {
        console.warn(`[${SERVICE.id}] automatic session restore did not find a usable external session`, result.error);
      }
    } catch (error) {
      console.warn(`[${SERVICE.id}] automatic session restore failed`, error.message);
    }
  };

  win.webContents.on('did-finish-load', () => {
    setTimeout(attemptRepair, 4500);
  });
}

function watchForSignedInState(win) {
  if (SMOKE_MODE || settings.quickAccessSeen) {
    return;
  }

  let attempts = 0;
  let timer = null;
  const check = async () => {
    if (!win || win.isDestroyed() || settings.quickAccessSeen || (quickAccessWindow && !quickAccessWindow.isDestroyed())) {
      if (timer) clearInterval(timer);
      return;
    }

    attempts += 1;
    if (await pageLooksSignedIn(win)) {
      if (timer) clearInterval(timer);
      createQuickAccessWindow(win);
      return;
    }

    if (attempts >= 36 && timer) {
      clearInterval(timer);
    }
  };

  win.webContents.once('did-finish-load', () => {
    setTimeout(check, 3500);
    timer = setInterval(check, 5000);
  });
}

function createQuickAccessWindow(parentWindow = mainWindow, options = {}) {
  if (quickAccessWindow && !quickAccessWindow.isDestroyed()) {
    quickAccessWindow.show();
    quickAccessWindow.focus();
    return quickAccessWindow;
  }

  quickAccessWindow = new BrowserWindow({
    width: 552,
    height: 466,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Acesso rapido ao ChatGPT',
    parent: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
    modal: Boolean(parentWindow && !parentWindow.isDestroyed()),
    icon: browserWindowIcon(),
    autoHideMenuBar: true,
    backgroundColor: '#202020',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'quick-access-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  quickAccessWindow.once('ready-to-show', () => {
    if (options.showOnReady !== false) {
      quickAccessWindow.show();
      quickAccessWindow.focus();
    }
  });

  quickAccessWindow.on('closed', () => {
    quickAccessWindow = null;
  });

  quickAccessWindow.loadFile(path.join(__dirname, 'quick-access.html'));
  return quickAccessWindow;
}

function createChatWindow(kind, options = {}) {
  const isMini = kind === 'mini';
  const savedBounds = isMini ? null : settings.mainBounds;
  const baseOptions = {
    width: isMini ? MINI_WINDOW_WIDTH : 1200,
    height: isMini ? MINI_WINDOW_HEIGHT : 820,
    minWidth: isMini ? 420 : 760,
    minHeight: isMini ? 520 : 560,
    title: isMini ? `${SERVICE.name} Quick Ask` : SERVICE.name,
    icon: browserWindowIcon(),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#17191b',
    alwaysOnTop: isMini && settings.miniAlwaysOnTop,
    skipTaskbar: isMini,
    fullscreenable: !isMini,
    webPreferences: baseWebPreferences(),
  };

  const win = new BrowserWindow(restoreBounds(baseOptions, savedBounds));
  configureWebContents(win);
  if (typeof win.webContents.setBackgroundThrottling === 'function') {
    win.webContents.setBackgroundThrottling(Boolean(settings.backgroundEfficiency));
  }
  if (isMini) {
    pinMiniWindow(win);
  }

  win.once('ready-to-show', () => {
    if (options.showOnReady !== false) {
      win.show();
      if (isMini) {
        reinforceMiniWindowPlacement(win);
        reinforceMiniWindowPin(win);
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.setTitle(SERVICE.name);
          }
        }, 1000);
      }
      win.focus();
    }
  });

  win.on('close', (event) => {
    rememberWindowBounds(kind, win);
    if (!isQuitting && settings.closeToTray) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on('minimize', (event) => {
    rememberWindowBounds(kind, win);
    if (!isQuitting && settings.minimizeToTray) {
      event.preventDefault();
      win.hide();
    }
  });

  if (options.load !== false) {
    const initialUrl = options.initialUrl || SERVICE.startUrl;
    Promise.resolve(win.browserIdentityReady)
      .then(() => {
        if (!win.isDestroyed()) {
          return win.loadURL(initialUrl);
        }
        return null;
      })
      .catch((error) => {
        console.warn(`[${SERVICE.id}] failed to load ${SERVICE.startUrl}`, error.message);
      });
  }

  watchForSessionRepair(win);

  if (!isMini) {
    watchForSignedInState(win);
  }

  return win;
}

function ensureMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createChatWindow('main');
  }
  return mainWindow;
}

function showMainWindow() {
  const win = ensureMainWindow();
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

function ensureMiniWindow(options = {}) {
  if (!miniWindow || miniWindow.isDestroyed()) {
    miniWindow = createChatWindow('mini', {
      ...options,
      initialUrl: options.initialUrl || miniInitialUrl(),
    });
    miniWindow.once('ready-to-show', () => positionMiniWindowBottomCenter(miniWindow));
  }
  return miniWindow;
}

function showMiniWindow() {
  const win = ensureMiniWindow();
  if (win.isMinimized()) {
    win.restore();
  }
  pinMiniWindow(win);
  win.show();
  reinforceMiniWindowPlacement(win);
  reinforceMiniWindowPin(win);
  win.focus();
}

function miniInitialUrl() {
  if (!settings.syncMiniWithMain || !mainWindow || mainWindow.isDestroyed()) {
    return SERVICE.startUrl;
  }

  const currentUrl = mainWindow.webContents.getURL();
  return isChatGptPageUrl(currentUrl) ? currentUrl : SERVICE.startUrl;
}

function toggleMiniWindow() {
  showMiniWindow();
}

async function getSessionStatus() {
  const cookies = appSession ? await appSession.cookies.get({}) : [];
  const sessionCookies = cookies.filter((cookie) => looksLikeSessionCookie({ name: cookie.name }));
  const visibleWindow = [mainWindow, miniWindow].find((win) => win && !win.isDestroyed());
  const pageSignedIn = visibleWindow ? await pageLooksSignedIn(visibleWindow) : false;
  const hasSessionCookies = sessionCookies.some((cookie) => (
    !cookie.expirationDate || cookie.expirationDate > Date.now() / 1000
  ));

  return {
    state: pageSignedIn ? 'signed-in' : hasSessionCookies ? 'cookies-present' : 'signed-out',
    signedIn: pageSignedIn,
    hasSessionCookies,
    cookieCount: cookies.length,
    sessionCookieCount: sessionCookies.length,
    isolatedPartition: SERVICE.partition,
    browserSyncActive: Boolean(externalBrowserImportTimer),
    currentUrl: visibleWindow ? visibleWindow.webContents.getURL() : '',
  };
}

function getDesktopIntegrationStatus() {
  const desktopId = kdeDesktopId();
  const desktopPath = path.join(kdeDesktopDir(), desktopId);
  const shortcutContent = safeReadFile(kdeShortcutsPath());
  const desktopContent = safeReadFile(desktopPath);
  const appImagePath = currentAppImagePath();
  const section = `[services][${desktopId}]`;
  const sectionStart = shortcutContent.indexOf(section);
  const sectionEnd = sectionStart >= 0 ? shortcutContent.indexOf('\n[', sectionStart + section.length) : -1;
  const sectionContent = sectionStart >= 0
    ? shortcutContent.slice(sectionStart, sectionEnd >= 0 ? sectionEnd : undefined)
    : '';
  const quickAskMatch = sectionContent.match(new RegExp(`^${QUICK_ASK_DESKTOP_ACTION}=([^\\n]*)`, 'm'));
  const quickAskValue = quickAskMatch ? quickAskMatch[1] : '';

  return {
    appImagePath,
    autostartEnabled: fs.existsSync(autostartDesktopPath()),
    autostartPath: autostartDesktopPath(),
    desktopEntryExists: Boolean(desktopContent),
    desktopPath,
    desktopPointsToCurrentAppImage: Boolean(desktopContent && desktopContent.includes(appImagePath)),
    kdeShortcutConfigured: shortcutValueHasAltSpace(quickAskValue),
    shortcutsPath: kdeShortcutsPath(),
  };
}

async function getDiagnostics() {
  const [memory, cacheSize, sessionStatus] = await Promise.all([
    process.getProcessMemoryInfo().catch(() => ({ private: 0, residentSet: 0 })),
    appSession ? appSession.getCacheSize().catch(() => 0) : Promise.resolve(0),
    getSessionStatus(),
  ]);
  const processMetrics = app.getAppMetrics();

  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromiumVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: `${process.platform} ${process.arch}`,
    appImagePath: currentAppImagePath(),
    userDataPath: app.getPath('userData'),
    memoryPrivateKb: memory.private || 0,
    memoryResidentKb: memory.residentSet || 0,
    cacheSize,
    processCount: processMetrics.length,
    gpuFeatureStatus: app.getGPUFeatureStatus(),
    session: sessionStatus,
    integration: getDesktopIntegrationStatus(),
  };
}

async function clearAppCache() {
  if (!appSession) {
    return { ok: false, error: 'Sessão do app ainda não foi inicializada.' };
  }

  const before = await appSession.getCacheSize().catch(() => 0);
  await appSession.clearCache();
  return { ok: true, clearedBytes: before };
}

async function clearAppSession(options = {}) {
  if (!appSession) {
    return { ok: false, error: 'Sessão do app ainda não foi inicializada.' };
  }

  stopExternalBrowserSessionImport();
  externalBrowserCookieSignature = '';
  sessionRepairAttempted = false;
  await appSession.clearStorageData({
    storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'serviceworkers', 'cachestorage'],
  });
  await flushPersistentSessionData('clear-app-session');

  if (options.reload !== false) {
    const windows = [mainWindow, miniWindow].filter((win) => win && !win.isDestroyed());
    await Promise.all(windows.map((win) => win.loadURL(SERVICE.startUrl).catch(() => {})));
    showMainWindow();
  }

  return { ok: true, status: await getSessionStatus() };
}

async function beginExternalBrowserLogin() {
  externalBrowserImportWarned = false;
  scheduleExternalBrowserSessionImport({ replaceExisting: true });
  if (!SMOKE_MODE) {
    await shell.openExternal(SERVICE.externalLoginUrl);
  }
  return {
    ok: true,
    url: SERVICE.externalLoginUrl,
    pollingSeconds: Math.round(EXTERNAL_COOKIE_IMPORT_WINDOW_MS / 1000),
  };
}

function publicSettings() {
  return {
    ...settings,
    serviceName: SERVICE.name,
    quickAskShortcut: QUICK_ASK_SHORTCUT,
    zoomFactor: normalizeZoomFactor(settings.zoomFactor),
    zoomPercent: zoomPercent(),
    zoomMinPercent: zoomPercent(ZOOM_MIN),
    zoomMaxPercent: zoomPercent(ZOOM_MAX),
    zoomStepPercent: Math.round(ZOOM_STEP * 100),
  };
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 940,
    height: 720,
    minWidth: 780,
    minHeight: 620,
    resizable: true,
    minimizable: true,
    maximizable: false,
    title: `Configurações do ${SERVICE.name}`,
    icon: browserWindowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'settings-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  return settingsWindow;
}

function openKdeShortcutSettings() {
  const child = spawn('kcmshell6', ['kcm_keys'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function rebuildTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `Abrir ${SERVICE.name}`, click: showMainWindow },
    { label: 'Abrir mini janela', click: showMiniWindow },
    { label: 'Exportador de conversas', click: openChatGptExporter },
    { label: 'Importar sessão do navegador', click: () => importExternalBrowserSession({ reload: true, replaceExisting: true, requireSessionCookie: true }).catch((error) => console.warn(`[${SERVICE.id}] manual browser session import failed`, error.message)) },
    { type: 'separator' },
    { label: `Diminuir zoom (${zoomPercent()}%)`, click: () => adjustZoom(-ZOOM_STEP) },
    { label: 'Restaurar zoom (100%)', click: resetZoom },
    { label: `Aumentar zoom (${zoomPercent()}%)`, click: () => adjustZoom(ZOOM_STEP) },
    { type: 'separator' },
    { label: `Reparar atalho ${QUICK_ASK_SHORTCUT}`, click: () => installKdeQuickAskShortcut().catch((error) => console.warn(`[${SERVICE.id}] KDE shortcut install failed`, error.message)) },
    { label: 'Configurações…', click: createSettingsWindow },
    { label: 'Atalhos do KDE…', click: openKdeShortcutSettings },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() },
  ]));
}

function createTray() {
  const image = nativeImage.createFromPath(iconPath());
  tray = new Tray(image.isEmpty() ? iconPath() : image);
  tray.setToolTip(SERVICE.trayTitle);
  tray.on('click', toggleMiniWindow);
  rebuildTrayMenu();
}

function createApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: SERVICE.name,
      submenu: [
        { label: `Abrir ${SERVICE.name}`, accelerator: 'CommandOrControl+O', click: showMainWindow },
        { label: 'Abrir mini janela', accelerator: 'CommandOrControl+Shift+Space', click: showMiniWindow },
        { label: 'Exportador de conversas', accelerator: 'CommandOrControl+E', click: openChatGptExporter },
        { label: 'Importar sessão do navegador', click: () => importExternalBrowserSession({ reload: true, replaceExisting: true, requireSessionCookie: true }).catch((error) => console.warn(`[${SERVICE.id}] manual browser session import failed`, error.message)) },
        { type: 'separator' },
        { label: `Diminuir zoom (${zoomPercent()}%)`, click: () => adjustZoom(-ZOOM_STEP) },
        { label: 'Restaurar zoom (100%)', click: resetZoom },
        { label: `Aumentar zoom (${zoomPercent()}%)`, click: () => adjustZoom(ZOOM_STEP) },
        { type: 'separator' },
        { label: `Reparar atalho ${QUICK_ASK_SHORTCUT}`, click: () => installKdeQuickAskShortcut().catch((error) => console.warn(`[${SERVICE.id}] KDE shortcut install failed`, error.message)) },
        { label: 'Configurações…', accelerator: 'CommandOrControl+,', click: createSettingsWindow },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'CommandOrControl+Q', click: () => app.quit() },
      ],
    },
  ]));
}

function setupIpc() {
  ipcMain.handle('settings:get', () => publicSettings());
  ipcMain.handle('settings:openKdeShortcuts', () => {
    openKdeShortcutSettings();
    return true;
  });
  ipcMain.handle('settings:installKdeShortcut', () => installKdeQuickAskShortcut());
  ipcMain.handle('settings:applyAutostart', () => applyAutostartSetting());
  ipcMain.handle('settings:importBrowserSession', () => importExternalBrowserSession({ reload: true, replaceExisting: true, requireSessionCookie: true }));
  ipcMain.handle('settings:getSessionStatus', () => getSessionStatus());
  ipcMain.handle('settings:getDiagnostics', () => getDiagnostics());
  ipcMain.handle('settings:clearCache', () => clearAppCache());
  ipcMain.handle('settings:clearSession', () => clearAppSession({ reload: true }));
  ipcMain.handle('settings:beginExternalLogin', () => beginExternalBrowserLogin());
  ipcMain.handle('settings:setZoom', (_event, zoomFactor) => ({ ok: true, settings: setZoomFactor(zoomFactor) }));
  ipcMain.handle('settings:adjustZoom', (_event, delta) => ({ ok: true, settings: adjustZoom(Number(delta) || 0) }));
  ipcMain.handle('settings:resetZoom', () => ({ ok: true, settings: resetZoom() }));
  ipcMain.handle('settings:save', (_event, patch) => {
    for (const key of [
      'automaticSessionRepair',
      'autoStart',
      'autoStartToTray',
      'backgroundEfficiency',
      'closeToTray',
      'minimizeToTray',
      'repairKdeShortcutOnStart',
      'syncMiniWithMain',
    ]) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        settings[key] = Boolean(patch[key]);
      }
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'miniAlwaysOnTop')) {
      settings.miniAlwaysOnTop = Boolean(patch.miniAlwaysOnTop);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'zoomFactor')) {
      settings.zoomFactor = normalizeZoomFactor(patch.zoomFactor);
    }
    if (miniWindow && !miniWindow.isDestroyed()) {
      pinMiniWindow(miniWindow);
    }
    for (const win of [mainWindow, miniWindow]) {
      if (win && !win.isDestroyed() && typeof win.webContents.setBackgroundThrottling === 'function') {
        win.webContents.setBackgroundThrottling(Boolean(settings.backgroundEfficiency));
      }
    }

    writeSettings();
    const autostart = applyAutostartSetting();
    applyZoomToChatWindows();
    rebuildTrayMenu();
    createApplicationMenu();
    return { ok: true, settings: publicSettings(), autostart };
  });
  ipcMain.handle('quickAccess:close', () => {
    settings.quickAccessSeen = true;
    writeSettings();
    if (quickAccessWindow && !quickAccessWindow.isDestroyed()) {
      quickAccessWindow.close();
    }
    return true;
  });
  ipcMain.handle('quickAccess:showMini', () => {
    settings.quickAccessSeen = true;
    writeSettings();
    if (quickAccessWindow && !quickAccessWindow.isDestroyed()) {
      quickAccessWindow.close();
    }
    showMiniWindow();
    return true;
  });
  ipcMain.handle('quickAccess:openSettings', () => {
    createSettingsWindow();
    return true;
  });
  ipcMain.handle('quickAccess:openKdeShortcuts', () => {
    openKdeShortcutSettings();
    return true;
  });
}

function loadUrlWithTimeout(win, url, timeoutMs) {
  let timeout;
  return Promise.resolve(win.browserIdentityReady)
    .then(() => Promise.race([
      win.loadURL(url),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out loading ${url}`)), timeoutMs);
      }),
    ]))
    .finally(() => clearTimeout(timeout));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPageCondition(win, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!win || win.isDestroyed()) {
      throw new Error('Window was destroyed while waiting for renderer state.');
    }
    try {
      if (await win.webContents.executeJavaScript(`Boolean(${expression})`, true)) {
        return true;
      }
    } catch {}
    await wait(100);
  }
  throw new Error(`Timed out waiting for renderer condition: ${expression}`);
}

function smokeStep(message) {
  if (SMOKE_MODE) {
    console.log(`[smoke-step] ${message}`);
  }
}

async function bodyText(win) {
  return win.webContents.executeJavaScript('document.body ? document.body.innerText : ""', true);
}

function hasUnsafeBrowserBlock(text) {
  return /browser or app may not be secure|navegador.*seguro|app may not be secure/i.test(text);
}

async function clickByText(win, patterns) {
  return win.webContents.executeJavaScript(`
    (() => {
      const patterns = ${JSON.stringify(patterns)}.map((pattern) => new RegExp(pattern, 'i'));
      const visibleText = (node) => (node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const candidates = [...document.querySelectorAll('button, a, [role="button"], div[tabindex], span[tabindex]')];
      const matches = candidates
        .filter(isVisible)
        .filter((node) => {
          const text = visibleText(node);
          const aria = node.getAttribute('aria-label') || '';
          return patterns.some((pattern) => pattern.test(text) || pattern.test(aria));
        })
        .sort((a, b) => visibleText(a).length - visibleText(b).length);
      const target = matches[0];
      if (!target) {
        return null;
      }
      target.focus();
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click']) {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      target.click();
      return { text: visibleText(target), aria: target.getAttribute('aria-label') || '', url: location.href };
    })()
  `, true);
}

function googleAccountsWindow() {
  return BrowserWindow.getAllWindows().find((win) => {
    if (win.isDestroyed()) {
      return false;
    }
    return hostMatches(hostFromUrl(win.webContents.getURL()), 'accounts.google.com');
  });
}

function loginFlowWindow(primaryWindow) {
  const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());
  const googleWin = googleAccountsWindow();
  if (googleWin) {
    return googleWin;
  }

  return windows
    .slice()
    .reverse()
    .find((win) => win !== primaryWindow && isTrustedUrl(win.webContents.getURL())) || primaryWindow;
}

function openWindowUrls() {
  return BrowserWindow.getAllWindows()
    .filter((win) => !win.isDestroyed())
    .map((win) => win.webContents.getURL());
}

function externalAuthLoginResult() {
  const event = externalAuthOpenEvents[0];
  if (!event) {
    return null;
  }

  return {
    url: event.targetUrl,
    sourceUrl: event.sourceUrl,
    externalHost: event.targetHost,
    sourceHost: event.sourceHost,
    cleanExternalStart: !hasAuthTransactionParameters(event.targetUrl),
    openedExternally: true,
    unsafeBrowserBlock: false,
  };
}

async function assertNoUnsafeGoogleBlock(win) {
  const text = await bodyText(win);
  if (hasUnsafeBrowserBlock(text)) {
    throw new Error('Google Accounts reported an unsafe browser block.');
  }
  return {
    url: win.webContents.getURL(),
    unsafeBrowserBlock: false,
  };
}

async function browserIdentitySnapshot(win) {
  return win.webContents.executeJavaScript(`
    (async () => {
      const uaData = navigator.userAgentData || null;
      const highEntropy = uaData && uaData.getHighEntropyValues
        ? await uaData.getHighEntropyValues(['architecture', 'bitness', 'fullVersionList', 'platformVersion', 'uaFullVersion', 'wow64'])
        : null;
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        webdriver: navigator.webdriver,
        languages: navigator.languages,
        userAgentData: uaData ? {
          brands: uaData.brands,
          mobile: uaData.mobile,
          platform: uaData.platform,
          highEntropy,
        } : null,
        hasChromeRuntime: Boolean(window.chrome && window.chrome.runtime),
      };
    })()
  `, true);
}

function assertBrowserIdentity(snapshot) {
  const brands = snapshot.userAgentData ? snapshot.userAgentData.brands || [] : [];
  const hasGoogleChromeBrand = brands.some((brand) => /Google Chrome/i.test(brand.brand));
  if (/Electron/i.test(snapshot.userAgent)) {
    throw new Error(`User agent still exposes Electron: ${snapshot.userAgent}`);
  }
  if (snapshot.webdriver !== undefined) {
    throw new Error(`navigator.webdriver is exposed as ${snapshot.webdriver}`);
  }
  if (!hasGoogleChromeBrand) {
    throw new Error(`navigator.userAgentData does not expose Google Chrome brand: ${JSON.stringify(brands)}`);
  }
}

async function submitGoogleIdentifierStep(win) {
  const submitted = await win.webContents.executeJavaScript(`
    (() => {
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const input = document.querySelector('input[type="email"], input[name="identifier"], input#identifierId');
      if (!input) {
        return { submitted: false, reason: 'identifier input not found' };
      }

      input.focus();
      input.value = ${JSON.stringify(GOOGLE_IDENTIFIER_TEST_EMAIL)};
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(GOOGLE_IDENTIFIER_TEST_EMAIL)} }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const candidates = [...document.querySelectorAll('button, [role="button"]')];
      const next = candidates.find((node) => /^(Next|Próxima|Avançar|Seguinte)$/i.test(normalize(node.innerText || node.textContent || node.getAttribute('aria-label'))));
      if (!next) {
        return { submitted: false, reason: 'next button not found' };
      }

      next.focus();
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click']) {
        next.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      }
      next.click();
      return { submitted: true, email: ${JSON.stringify(GOOGLE_IDENTIFIER_TEST_EMAIL)} };
    })()
  `, true);

  if (!submitted.submitted) {
    return submitted;
  }

  await wait(7000);
  const text = await bodyText(win);
  if (hasUnsafeBrowserBlock(text)) {
    throw new Error('Google Accounts reported an unsafe browser block after submitting the identifier step.');
  }

  return {
    ...submitted,
    unsafeBrowserBlockAfterIdentifier: false,
  };
}

async function runGoogleButtonFlowSmoke(win) {
  const attempts = [];
  const loginPatterns = [
    '^entrar$',
    '^log in$',
    '^sign in$',
    'continue with google',
    'continuar com google',
    'sign in with google',
    'log in with google',
    'google',
  ];
  const googlePatterns = [
    'continue with google',
    'continuar com google',
    'sign in with google',
    'log in with google',
    'google',
  ];

  await wait(6000);

  for (let step = 0; step < 8; step += 1) {
    const externalResult = externalAuthLoginResult();
    if (externalResult) {
      return externalResult;
    }

    const targetWindow = loginFlowWindow(win);
    if (hostMatches(hostFromUrl(targetWindow.webContents.getURL()), 'accounts.google.com')) {
      const result = await assertNoUnsafeGoogleBlock(targetWindow);
      result.identifierStep = await submitGoogleIdentifierStep(targetWindow);
      return result;
    }

    const text = await bodyText(targetWindow);
    if (hasUnsafeBrowserBlock(text)) {
      throw new Error(`${SERVICE.name} login page reported an unsafe browser block.`);
    }

    const clicked = await clickByText(targetWindow, step === 0 ? loginPatterns : googlePatterns);
    attempts.push({
      step,
      url: targetWindow.webContents.getURL(),
      clicked,
      text: text.replace(/\s+/g, ' ').slice(0, 500),
    });
    if (!clicked) {
      await wait(2500);
    } else {
      await wait(7000);
    }

    const afterClickExternalResult = externalAuthLoginResult();
    if (afterClickExternalResult) {
      return afterClickExternalResult;
    }
  }

  const externalResult = externalAuthLoginResult();
  if (externalResult) {
    return externalResult;
  }

  const googleWin = googleAccountsWindow();
  if (!googleWin) {
    throw new Error(`${SERVICE.name} Google sign-in button did not reach Google Accounts. Attempts: ${JSON.stringify(attempts)}. Open URLs: ${openWindowUrls().join(', ')}`);
  }

  const result = await assertNoUnsafeGoogleBlock(googleWin);
  result.identifierStep = await submitGoogleIdentifierStep(googleWin);
  return result;
}

async function createSmokeCookieDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'smoke-browser-cookies.sqlite');
  const script = `
import sqlite3
import sys
db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
conn.execute('create table moz_cookies (host text, name text, value text, path text, expiry integer, isSecure integer, isHttpOnly integer, sameSite integer)')
conn.execute('insert into moz_cookies values (?, ?, ?, ?, ?, ?, ?, ?)', ('.chatgpt.com', 'codex_smoke_session', 'smoke-value', '/', 1893456000, 1, 1, 1))
conn.execute('insert into moz_cookies values (?, ?, ?, ?, ?, ?, ?, ?)', ('.example.com', 'ignored_cookie', 'ignored', '/', 1893456000, 1, 1, 1))
conn.commit()
conn.close()
`;

  await execFileOutput('python3', ['-c', script, dbPath]);
  process.env[EXTERNAL_COOKIE_IMPORT_ENV] = dbPath;
  return dbPath;
}

async function runSmokeTest() {
  const results = [];

  smokeStep('create main window');
  mainWindow = createChatWindow('main', { showOnReady: false, load: false });
  smokeStep('load main url');
  await loadUrlWithTimeout(mainWindow, SERVICE.startUrl, 60000);
  results.push({ window: 'main', url: mainWindow.webContents.getURL() });

  await waitForPageCondition(mainWindow, 'window.__codexChatGptExporterLoaded === true', 30000);
  const exporterLoadedAutomatically = await mainWindow.webContents.executeJavaScript(
    'Boolean(window.__codexChatGptExporterLoaded)',
    true,
  );
  if (!exporterLoadedAutomatically) {
    throw new Error('ChatGPT exporter was not restored automatically in the main page.');
  }
  results.push({ window: 'exporter-auto-load', loadedAutomatically: true });

  smokeStep('verify zoom persistence');
  setZoomFactor(0.85);
  const persistedZoom = readSettings().zoomFactor;
  const mainZoom = mainWindow.webContents.getZoomFactor();
  if (Math.abs(persistedZoom - 0.85) > 0.001 || Math.abs(mainZoom - 0.85) > 0.001) {
    throw new Error(`Zoom did not persist or apply to the main window: ${JSON.stringify({ persistedZoom, mainZoom })}`);
  }
  results.push({ window: 'zoom-persistence', persistedZoom, mainZoom });

  smokeStep('verify tray hide behavior');
  showMainWindow();
  await wait(500);
  mainWindow.minimize();
  await wait(500);
  if (mainWindow.isDestroyed() || mainWindow.isVisible()) {
    throw new Error(`Minimize-to-tray did not hide the main window: ${JSON.stringify({
      destroyed: mainWindow.isDestroyed(),
      visible: mainWindow.isDestroyed() ? false : mainWindow.isVisible(),
    })}`);
  }
  showMainWindow();
  await wait(500);
  mainWindow.close();
  await wait(500);
  if (mainWindow.isDestroyed() || mainWindow.isVisible()) {
    throw new Error(`Close-to-tray did not hide the main window: ${JSON.stringify({
      destroyed: mainWindow.isDestroyed(),
      visible: mainWindow.isDestroyed() ? false : mainWindow.isVisible(),
    })}`);
  }
  showMainWindow();
  results.push({ window: 'tray-hide', minimizeToTray: true, closeToTray: true });

  smokeStep('run Google button flow');
  const googleButtonResult = await runGoogleButtonFlowSmoke(mainWindow);
  if (!googleButtonResult.cleanExternalStart || googleButtonResult.url !== SERVICE.externalLoginUrl) {
    throw new Error(`Google login handoff did not start a clean external browser session: ${JSON.stringify(googleButtonResult)}`);
  }
  results.push({ window: 'service-google-button', ...googleButtonResult });

  smokeStep('render quick access guide');
  const guideWindow = createQuickAccessWindow(mainWindow, { showOnReady: false });
  await waitForPageCondition(guideWindow, 'location.protocol === "file:" && document.readyState === "complete"');
  const guideText = await bodyText(guideWindow);
  if (!/acesso r[aá]pido/i.test(guideText) || !/ChatGPT onde voc[eê] estiver/i.test(guideText)) {
    throw new Error(`Quick access guide did not render expected text: ${JSON.stringify(guideText)}`);
  }
  results.push({ window: 'quick-access-guide', rendered: true });
  guideWindow.close();

  smokeStep('render preferences');
  const preferencesWindow = createSettingsWindow();
  await waitForPageCondition(preferencesWindow, 'document.documentElement.dataset.ready === "true"');
  const preferencesText = await preferencesWindow.webContents.executeJavaScript(
    'document.body ? document.body.textContent : ""',
    true,
  );
  const preferencesStructure = await preferencesWindow.webContents.executeJavaScript(`
    ({
      sections: document.querySelectorAll('.settings-section').length,
      navigationItems: document.querySelectorAll('.nav-item').length,
      requiredControls: ['autoStart', 'minimizeToTray', 'closeToTray', 'backgroundEfficiency', 'zoomRange', 'importSession', 'freshLogin', 'installShortcut', 'diagnosticGrid']
        .every((id) => Boolean(document.getElementById(id))),
    })
  `, true);
  if (
    preferencesStructure.sections !== 5
    || preferencesStructure.navigationItems !== 5
    || !preferencesStructure.requiredControls
    || !/login e sess[aã]o/i.test(preferencesText)
    || !/economia em segundo plano/i.test(preferencesText)
    || !/mini janela/i.test(preferencesText)
  ) {
    throw new Error('Preferences window did not render the KDE shortcut and browser session controls.');
  }
  const preferencesZoomValue = await preferencesWindow.webContents.executeJavaScript('document.getElementById("zoomValue").textContent', true);
  if (preferencesZoomValue !== '85%') {
    throw new Error(`Preferences window did not render persisted zoom value: ${preferencesZoomValue}`);
  }
  results.push({ window: 'preferences', rendered: true });
  preferencesWindow.close();

  smokeStep('create mini window');
  miniWindow = createChatWindow('mini', { showOnReady: false, load: false });
  smokeStep('load mini url');
  await loadUrlWithTimeout(miniWindow, SERVICE.startUrl, 60000);
  const miniZoom = miniWindow.webContents.getZoomFactor();
  if (Math.abs(miniZoom - 0.85) > 0.001) {
    throw new Error(`Zoom did not apply to the mini window: ${miniZoom}`);
  }
  results.push({ window: 'mini', url: miniWindow.webContents.getURL(), zoom: miniZoom });
  smokeStep('toggle mini window');
  handleAppCommand([TOGGLE_MINI_ARG]);
  await wait(2200);
  if (!miniWindow.isVisible() || !miniWindow.isAlwaysOnTop()) {
    throw new Error('Mini window did not become visible and always-on-top.');
  }
  handleAppCommand([TOGGLE_MINI_ARG]);
  await wait(2200);
  if (!miniWindow.isVisible() || !miniWindow.isAlwaysOnTop()) {
    throw new Error('Second mini shortcut command hid or unpinned the mini window.');
  }
  const miniBounds = miniWindow.getBounds();
  const miniDisplay = screen.getDisplayMatching(miniBounds);
  const expectedMiniWidth = Math.min(MINI_WINDOW_WIDTH, Math.max(320, miniDisplay.workArea.width - 24));
  const expectedMiniHeight = Math.min(MINI_WINDOW_HEIGHT, Math.max(420, miniDisplay.workArea.height - 24));
  const expectedMiniX = Math.round(miniDisplay.workArea.x + (miniDisplay.workArea.width - expectedMiniWidth) / 2);
  const expectedMiniY = Math.max(
    miniDisplay.workArea.y,
    Math.round(miniDisplay.workArea.y + miniDisplay.workArea.height - expectedMiniHeight - MINI_WINDOW_BOTTOM_MARGIN),
  );
  if (
    miniBounds.width !== expectedMiniWidth
    || miniBounds.height !== expectedMiniHeight
    || Math.abs(miniBounds.x - expectedMiniX) > 4
    || Math.abs(miniBounds.y - expectedMiniY) > 4
  ) {
    throw new Error(`Mini window is not bottom-centered at the expected size: ${JSON.stringify({
      actual: miniBounds,
      expected: {
        x: expectedMiniX,
        y: expectedMiniY,
        width: expectedMiniWidth,
        height: expectedMiniHeight,
      },
      workArea: miniDisplay.workArea,
    })}`);
  }
  results.push({
    window: 'mini-toggle-command',
    visible: miniWindow.isVisible(),
    alwaysOnTop: miniWindow.isAlwaysOnTop(),
    bounds: miniBounds,
  });

  smokeStep('verify OpenAI auth and Google Accounts are opened externally');
  const openAiAuthUrl = 'https://auth.openai.com/authorize?client_id=codex-smoke&redirect_uri=https%3A%2F%2Fchatgpt.com%2F';
  const googleAccountsUrl = 'https://accounts.google.com/';
  if (!shouldOpenExternally(openAiAuthUrl)) {
    throw new Error('OpenAI auth is not configured for external login.');
  }
  if (!shouldOpenExternally(googleAccountsUrl)) {
    throw new Error('Google Accounts is not configured for external login.');
  }
  await openExternalUrl(openAiAuthUrl);
  await openExternalUrl(googleAccountsUrl);
  const authHandoffsWithTransactionTargets = externalAuthOpenEvents.filter((event) => hasAuthTransactionParameters(event.targetUrl));
  if (authHandoffsWithTransactionTargets.length > 0) {
    throw new Error(`External browser received Electron auth transaction URLs: ${JSON.stringify(authHandoffsWithTransactionTargets)}`);
  }
  results.push({
    window: 'external-auth-policy',
    sourceUrls: [openAiAuthUrl, googleAccountsUrl],
    openedUrls: externalAuthOpenEvents.map((event) => event.targetUrl),
    openedExternally: true,
    cleanExternalStart: true,
    unsafeBrowserBlock: false,
  });

  smokeStep('verify external browser cookie import');
  const smokeCookieDb = await createSmokeCookieDatabase();
  const importResult = await importExternalBrowserSession({ reload: false });
  if (importResult.imported < 1) {
    throw new Error(`External browser cookie import did not import the smoke cookie: ${JSON.stringify(importResult)}`);
  }
  const importedSmokeCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: 'codex_smoke_session',
  });
  if (!importedSmokeCookies.some((cookie) => cookie.value === 'smoke-value')) {
    throw new Error('External browser cookie import did not write the smoke cookie into the Electron session.');
  }
  results.push({
    window: 'external-browser-session-import',
    source: smokeCookieDb,
    imported: importResult.imported,
    sessionLikeCookies: importResult.sessionLikeCookies,
  });

  smokeStep('assert browser identity');
  const identity = await browserIdentitySnapshot(mainWindow);
  assertBrowserIdentity(identity);

  console.log(`[smoke] ${SERVICE.name} ${JSON.stringify({ chrome: chromeVersion(), browserIdentity: identity, results })}`);
}

async function runSettingsPageTest() {
  const win = createSettingsWindow();
  await waitForPageCondition(win, 'document.documentElement.dataset.ready === "true"');

  const snapshot = await win.webContents.executeJavaScript(`
    (() => ({
      title: document.title,
      activeSection: document.querySelector('.settings-section.active')?.id || '',
      navigationItems: document.querySelectorAll('.nav-item').length,
      settingsSections: document.querySelectorAll('.settings-section').length,
      zoom: document.getElementById('zoomValue')?.textContent || '',
      hasLoginControls: Boolean(document.getElementById('importSession') && document.getElementById('freshLogin')),
      hasDiagnostics: Boolean(document.getElementById('diagnosticGrid')),
      apiMethods: Object.keys(window.settingsApi || {}).sort(),
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
    }))()
  `, true);

  if (
    snapshot.activeSection !== 'general'
    || snapshot.navigationItems !== 5
    || snapshot.settingsSections !== 5
    || !snapshot.hasLoginControls
    || !snapshot.hasDiagnostics
    || !snapshot.apiMethods.includes('getDiagnostics')
    || !snapshot.apiMethods.includes('clearSession')
    || snapshot.bodyWidth > snapshot.viewportWidth
  ) {
    throw new Error(`Settings page structure is incomplete: ${JSON.stringify(snapshot)}`);
  }

  const diagnostics = await getDiagnostics();
  if (!diagnostics.integration || !diagnostics.session || diagnostics.processCount < 1) {
    throw new Error(`Settings diagnostics are incomplete: ${JSON.stringify(diagnostics)}`);
  }

  const screenshotPath = process.env.CHATGPT_SETTINGS_SCREENSHOT
    || path.join(os.tmpdir(), 'chatgpt-settings-professional.png');
  const screenshot = await win.webContents.capturePage();
  fs.writeFileSync(screenshotPath, screenshot.toPNG());

  await win.webContents.executeJavaScript(`document.querySelector('[data-section="login"]').click()`, true);
  await wait(150);
  const loginScreenshotPath = screenshotPath.replace(/\.png$/i, '-login.png');
  fs.writeFileSync(loginScreenshotPath, (await win.webContents.capturePage()).toPNG());

  win.setSize(780, 620);
  await wait(200);
  await win.webContents.executeJavaScript(`document.querySelector('[data-section="diagnostics"]').click()`, true);
  await wait(250);
  const compactLayout = await win.webContents.executeJavaScript(`({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
  })`, true);
  if (compactLayout.bodyWidth > compactLayout.viewportWidth) {
    throw new Error(`Settings compact layout overflows horizontally: ${JSON.stringify(compactLayout)}`);
  }
  const compactScreenshotPath = screenshotPath.replace(/\.png$/i, '-compact.png');
  fs.writeFileSync(compactScreenshotPath, (await win.webContents.capturePage()).toPNG());

  console.log(`[settings-page-test] ${SERVICE.name} ${JSON.stringify({ screenshotPath, loginScreenshotPath, compactScreenshotPath, snapshot, compactLayout, diagnostics: {
    appVersion: diagnostics.appVersion,
    processCount: diagnostics.processCount,
    sessionState: diagnostics.session.state,
    kdeShortcutConfigured: diagnostics.integration.kdeShortcutConfigured,
  } })}`);
}

async function runBrowserImportTest() {
  const importResult = await importExternalBrowserSession({ reload: false });
  const chatgptCookies = await appSession.cookies.get({ url: SERVICE.startUrl });
  const importedCookieNames = chatgptCookies.map((cookie) => cookie.name).sort();
  const sessionCookieNames = importedCookieNames.filter((name) => (
    /^__Secure-next-auth\.session-token\./.test(name)
    || name === '__Secure-oai-is'
    || name === 'oai-sc'
    || name === 'cf_clearance'
  ));

  if (sessionCookieNames.length === 0) {
    throw new Error(`No ChatGPT session cookies were imported from the external browser. ${JSON.stringify({
      source: importResult.source,
      imported: importResult.imported,
      candidateCookies: importResult.candidateCookies,
      error: importResult.error,
    })}`);
  }

  smokeStep('load ChatGPT with imported external browser session');
  const testWindow = createChatWindow('main', { showOnReady: false, load: false });
  await loadUrlWithTimeout(testWindow, SERVICE.startUrl, 60000);
  await wait(12000);
  const signedIn = await pageLooksSignedIn(testWindow);
  const text = await bodyText(testWindow);
  const hasLoginPrompt = /\b(Log in|Sign up|Continue with Google|Entrar|Criar conta)\b/i.test(text);

  if (!signedIn) {
    throw new Error(`Imported browser session cookies were accepted by Electron but ChatGPT did not render a signed-in shell. ${JSON.stringify({
      source: importResult.source,
      imported: importResult.imported,
      sessionCookieNames,
      hasLoginPrompt,
      pageText: text.replace(/\s+/g, ' ').slice(0, 240),
    })}`);
  }

  console.log(`[browser-import-test] ${SERVICE.name} ${JSON.stringify({
    source: importResult.source,
    imported: importResult.imported,
    removedStaleCookies: importResult.removedStaleCookies,
    candidateCookies: importResult.candidateCookies,
    sessionCookieNames,
    signedIn,
  })}`);
}

function expectedMiniBoundsForDisplay(display) {
  const width = Math.min(MINI_WINDOW_WIDTH, Math.max(320, display.workArea.width - 24));
  const height = Math.min(MINI_WINDOW_HEIGHT, Math.max(420, display.workArea.height - 24));
  return {
    x: Math.round(display.workArea.x + (display.workArea.width - width) / 2),
    y: Math.max(
      display.workArea.y,
      Math.round(display.workArea.y + display.workArea.height - height - MINI_WINDOW_BOTTOM_MARGIN),
    ),
    width,
    height,
  };
}

function assertMiniWindowBottomCentered(win) {
  const actual = win.getBounds();
  const display = screen.getDisplayMatching(actual);
  const expected = expectedMiniBoundsForDisplay(display);
  if (
    actual.width !== expected.width
    || actual.height !== expected.height
    || Math.abs(actual.x - expected.x) > 4
    || Math.abs(actual.y - expected.y) > 4
  ) {
    throw new Error(`Mini window is not bottom-centered at the expected size: ${JSON.stringify({
      actual,
      expected,
      workArea: display.workArea,
    })}`);
  }

  return { actual, expected, workArea: display.workArea };
}

async function runMiniWindowTest() {
  settings = { ...settings, closeToTray: true, minimizeToTray: true, miniAlwaysOnTop: true };

  mainWindow = createChatWindow('main', { showOnReady: false, load: false });
  await loadUrlWithTimeout(mainWindow, 'about:blank', 10000);
  showMainWindow();
  await wait(1000);

  handleAppCommand([TOGGLE_MINI_ARG]);
  await wait(4800);
  if (!miniWindow || miniWindow.isDestroyed() || !miniWindow.isVisible() || !miniWindow.isAlwaysOnTop()) {
    throw new Error('Mini window did not open visibly and always-on-top with the main window open.');
  }
  const first = assertMiniWindowBottomCentered(miniWindow);

  handleAppCommand([TOGGLE_MINI_ARG]);
  await wait(4800);
  if (miniWindow.isDestroyed() || !miniWindow.isVisible() || !miniWindow.isAlwaysOnTop()) {
    throw new Error('Second mini shortcut command hid, destroyed, or unpinned the mini window.');
  }
  const second = assertMiniWindowBottomCentered(miniWindow);

  console.log(`[mini-window-test] ${SERVICE.name} ${JSON.stringify({
    first,
    second,
    visible: miniWindow.isVisible(),
    alwaysOnTop: miniWindow.isAlwaysOnTop(),
  })}`);
}

async function createSessionPersistenceCookieDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'session-persistence-browser-cookies.sqlite');
  const expirySeconds = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
  const expiryMilliseconds = expirySeconds * 1000;
  const script = `
import sqlite3
import sys
db_path = sys.argv[1]
expiry_ms = int(sys.argv[2])
conn = sqlite3.connect(db_path)
conn.execute('create table moz_cookies (host text, name text, value text, path text, expiry integer, isSecure integer, isHttpOnly integer, sameSite integer)')
conn.execute('insert into moz_cookies values (?, ?, ?, ?, ?, ?, ?, ?)', ('.chatgpt.com', '__Secure-next-auth.session-token.0', 'external-session-value', '/', expiry_ms, 1, 1, 1))
conn.execute('insert into moz_cookies values (?, ?, ?, ?, ?, ?, ?, ?)', ('.chatgpt.com', 'expired_external_cookie', 'expired', '/', 1, 1, 1, 1))
conn.commit()
conn.close()
`;

  await execFileOutput('python3', ['-c', script, dbPath, String(expiryMilliseconds)]);
  process.env[EXTERNAL_COOKIE_IMPORT_ENV] = dbPath;
  return { dbPath, expirySeconds };
}

async function runSessionPersistenceTest() {
  const { dbPath, expirySeconds } = await createSessionPersistenceCookieDatabase();
  await appSession.cookies.set({
    url: 'https://chatgpt.com/',
    name: 'codex_existing_cookie',
    value: 'keep-me',
    path: '/',
    secure: true,
    httpOnly: true,
    expirationDate: expirySeconds,
  });
  await flushPersistentSessionData('session-persistence-test-before-import');

  const importResult = await importExternalBrowserSession({
    reload: false,
    replaceExisting: false,
    requireSessionCookie: true,
  });
  if (importResult.imported < 1 || importResult.removedStaleCookies !== 0) {
    throw new Error(`Session persistence import did not preserve existing cookies: ${JSON.stringify(importResult)}`);
  }

  const existingCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: 'codex_existing_cookie',
  });
  if (!existingCookies.some((cookie) => cookie.value === 'keep-me')) {
    throw new Error('Existing Electron session cookie was removed during external import.');
  }

  const importedCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: '__Secure-next-auth.session-token.0',
  });
  const importedCookie = importedCookies.find((cookie) => cookie.value === 'external-session-value');
  if (!importedCookie) {
    throw new Error('External browser session cookie was not imported.');
  }
  if (!importedCookie.expirationDate || importedCookie.expirationDate > expirySeconds + 5) {
    throw new Error(`External cookie expiration was not normalized to seconds: ${JSON.stringify(importedCookie)}`);
  }

  const expiredCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: 'expired_external_cookie',
  });
  if (expiredCookies.length > 0) {
    throw new Error('Expired external cookie was imported.');
  }

  await flushPersistentSessionData('session-persistence-test-after-import');
  console.log(`[session-persistence-test] ${SERVICE.name} ${JSON.stringify({
    source: dbPath,
    imported: importResult.imported,
    removedStaleCookies: importResult.removedStaleCookies,
    normalizedExpiration: importedCookie.expirationDate,
    existingCookiePreserved: true,
  })}`);
}

async function runSessionDetachTest() {
  const { dbPath, expirySeconds } = await createSessionPersistenceCookieDatabase();
  await appSession.cookies.set({
    url: 'https://chatgpt.com/',
    name: '__Secure-next-auth.session-token.0',
    value: 'electron-session-value',
    path: '/',
    secure: true,
    httpOnly: true,
    expirationDate: expirySeconds,
  });
  await appSession.cookies.set({
    url: 'https://chatgpt.com/',
    name: 'codex_app_only_cookie',
    value: 'keep-app-state',
    path: '/',
    secure: true,
    httpOnly: true,
    expirationDate: expirySeconds,
  });
  await flushPersistentSessionData('session-detach-test-before-import');

  const importResult = await importExternalBrowserSession({
    reload: false,
    replaceExisting: false,
    requireSessionCookie: true,
    skipIfElectronSessionPresent: true,
  });
  if (!importResult.skipped || importResult.imported !== 0 || importResult.reason !== 'electron-session-present') {
    throw new Error(`External browser import did not detach from an existing Electron session: ${JSON.stringify(importResult)}`);
  }

  const sessionCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: '__Secure-next-auth.session-token.0',
  });
  const appSessionCookie = sessionCookies.find((cookie) => cookie.value === 'electron-session-value');
  const externalSessionCookie = sessionCookies.find((cookie) => cookie.value === 'external-session-value');
  if (!appSessionCookie || externalSessionCookie) {
    throw new Error(`External browser cookies overwrote the app session: ${JSON.stringify(sessionCookies)}`);
  }

  const appOnlyCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: 'codex_app_only_cookie',
  });
  if (!appOnlyCookies.some((cookie) => cookie.value === 'keep-app-state')) {
    throw new Error('App-only cookie was removed during detached external browser import.');
  }

  console.log(`[session-detach-test] ${SERVICE.name} ${JSON.stringify({
    source: dbPath,
    skipped: importResult.skipped,
    reason: importResult.reason,
    imported: importResult.imported,
    appSessionPreserved: true,
    appOnlyCookiePreserved: true,
  })}`);
}

async function runSessionReplaceTest() {
  const { dbPath, expirySeconds } = await createSessionPersistenceCookieDatabase();
  await appSession.cookies.set({
    url: 'https://chatgpt.com/',
    name: '__Secure-next-auth.session-token.0',
    value: 'expired-electron-session-value',
    path: '/',
    secure: true,
    httpOnly: true,
    expirationDate: expirySeconds,
  });
  await appSession.cookies.set({
    url: 'https://chatgpt.com/',
    name: 'codex_existing_cookie',
    value: 'remove-me-on-explicit-repair',
    path: '/',
    secure: true,
    httpOnly: true,
    expirationDate: expirySeconds,
  });
  await flushPersistentSessionData('session-replace-test-before-import');

  const importResult = await importExternalBrowserSession({
    reload: false,
    replaceExisting: true,
    requireSessionCookie: true,
  });
  if (importResult.imported < 1 || importResult.removedStaleCookies < 1) {
    throw new Error(`Explicit external browser import did not replace existing Electron cookies: ${JSON.stringify(importResult)}`);
  }

  const sessionCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: '__Secure-next-auth.session-token.0',
  });
  const externalSessionCookie = sessionCookies.find((cookie) => cookie.value === 'external-session-value');
  const staleSessionCookie = sessionCookies.find((cookie) => cookie.value === 'expired-electron-session-value');
  if (!externalSessionCookie || staleSessionCookie) {
    throw new Error(`Explicit repair did not replace the stale app session cookie: ${JSON.stringify(sessionCookies)}`);
  }

  const removedCookies = await appSession.cookies.get({
    url: 'https://chatgpt.com/',
    name: 'codex_existing_cookie',
  });
  if (removedCookies.length > 0) {
    throw new Error('Explicit repair did not clear existing app cookies before import.');
  }

  console.log(`[session-replace-test] ${SERVICE.name} ${JSON.stringify({
    source: dbPath,
    imported: importResult.imported,
    removedStaleCookies: importResult.removedStaleCookies,
    staleSessionReplaced: true,
  })}`);
}

async function runSessionCookieChangeTest() {
  const { dbPath } = await createSessionPersistenceCookieDatabase();
  externalBrowserCookieSignature = '';
  const first = await importExternalBrowserSession({
    reload: false,
    onlyOnChange: true,
    requireSessionCookie: true,
  });
  if (first.imported !== 1) {
    throw new Error(`Initial same-length cookie test import failed: ${JSON.stringify(first)}`);
  }

  const originalValue = 'external-session-value';
  const replacementValue = 'changed!-session-value';
  if (originalValue.length !== replacementValue.length) {
    throw new Error('Session change test values must have identical lengths.');
  }
  await execFileOutput('python3', ['-c', `
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
conn.execute('update moz_cookies set value = ? where name = ?', (sys.argv[2], '__Secure-next-auth.session-token.0'))
conn.commit()
conn.close()
`, dbPath, replacementValue]);

  const second = await importExternalBrowserSession({
    reload: false,
    onlyOnChange: true,
    replaceExisting: true,
    requireSessionCookie: true,
  });
  const cookies = await appSession.cookies.get({
    url: SERVICE.startUrl,
    name: '__Secure-next-auth.session-token.0',
  });
  if (second.imported !== 1 || !cookies.some((cookie) => cookie.value === replacementValue)) {
    throw new Error(`Same-length session token change was not detected: ${JSON.stringify({ second, cookies })}`);
  }

  console.log(`[session-cookie-change-test] ${SERVICE.name} ${JSON.stringify({
    firstImported: first.imported,
    secondImported: second.imported,
    sameLength: true,
    tokenChangeDetected: true,
  })}`);
}

function runSessionReloadPolicyTest() {
  const cases = [
    {
      name: 'current-conversation',
      currentUrl: 'https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc',
      expected: 'https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc',
    },
    {
      name: 'current-conversation-with-query',
      currentUrl: 'https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc?model=gpt-5',
      expected: 'https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc?model=gpt-5',
    },
    {
      name: 'legacy-chat-domain',
      currentUrl: 'https://chat.openai.com/c/12345678-1234-1234-1234-123456789abc',
      expected: 'https://chat.openai.com/c/12345678-1234-1234-1234-123456789abc',
    },
    {
      name: 'gpt-builder',
      currentUrl: 'https://chatgpt.com/g/g-abc123-test',
      expected: 'https://chatgpt.com/g/g-abc123-test',
    },
    {
      name: 'blank-window-fallback',
      currentUrl: 'about:blank',
      expected: SERVICE.startUrl,
    },
    {
      name: 'untrusted-window-fallback',
      currentUrl: 'https://example.com/c/12345678-1234-1234-1234-123456789abc',
      expected: SERVICE.startUrl,
    },
  ];

  for (const testCase of cases) {
    const actual = preservedChatReloadUrl(testCase.currentUrl);
    if (actual !== testCase.expected) {
      throw new Error(`Session reload policy failed for ${testCase.name}: ${JSON.stringify({
        currentUrl: testCase.currentUrl,
        expected: testCase.expected,
        actual,
      })}`);
    }
  }

  console.log(`[session-reload-policy-test] ${SERVICE.name} ${JSON.stringify({
    preservedConversationUrls: cases.filter((testCase) => testCase.expected === testCase.currentUrl).length,
    fallbackUrls: cases.filter((testCase) => testCase.expected === SERVICE.startUrl).length,
  })}`);
}

function runExporterIntegrationTest() {
  const source = buildChatGptExporterInjectionScript();
  const requiredSnippets = [
    'window.GM_getValue',
    'jszip',
    'snapdom',
    'Portugues (Brasil)',
    'var PT_BR =',
    `var defaultExportAllLimit = ${CHATGPT_EXPORTER_ALL_LIMIT};`,
    'const hasConversationLimit = Number.isFinite(maxConversations) && maxConversations > 0;',
    'children: "Sem limite"',
    'return PT_BR.code;',
    'Exportador do ChatGPT',
    'data-ce-original-export-menu',
    'data-app-action-sidebar-scroll',
    'data-app-navigation-rail',
    'data-theme", "dark',
  ];

  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      throw new Error(`ChatGPT exporter integration is missing snippet: ${snippet}`);
    }
  }

  const forbiddenSnippets = [
    'if (conversations.length >= maxConversations) break;',
    'const result = conversations.slice(0, maxConversations);',
  ];

  for (const snippet of forbiddenSnippets) {
    if (source.includes(snippet)) {
      throw new Error(`ChatGPT exporter integration still contains limited script snippet: ${snippet}`);
    }
  }

  console.log(`[exporter-integration-test] ${SERVICE.name} ${JSON.stringify({
    scriptBytes: source.length,
    language: 'pt-BR',
    exportAllLimit: CHATGPT_EXPORTER_ALL_LIMIT,
    unlimited: CHATGPT_EXPORTER_ALL_LIMIT === 0,
    jszip: source.includes('JSZip'),
    snapdom: source.includes('window.snapdom'),
  })}`);
}

async function runExporterPageTest() {
  const importResult = await importExternalBrowserSession({ reload: false });
  if (importResult.imported < 1) {
    throw new Error(`External browser session import did not find usable ChatGPT cookies: ${JSON.stringify(importResult)}`);
  }

  const testWindow = createChatWindow('main', { showOnReady: false, load: false });
  await loadUrlWithTimeout(testWindow, SERVICE.startUrl, 60000);
  await wait(12000);

  const signedIn = await pageLooksSignedIn(testWindow);
  if (!signedIn) {
    const text = await bodyText(testWindow);
    throw new Error(`ChatGPT did not render a signed-in shell before exporter injection: ${JSON.stringify({
      source: importResult.source,
      imported: importResult.imported,
      pageText: text.replace(/\s+/g, ' ').slice(0, 240),
    })}`);
  }

  const injected = await injectChatGptExporter(testWindow);
  if (!injected) {
    throw new Error('ChatGPT exporter was not injected into the ChatGPT page.');
  }

  await wait(2500);
  const state = await testWindow.webContents.executeJavaScript(`
    (() => new Promise((resolve) => {
      const getCandidates = () => Array.from(document.querySelectorAll('[aria-label], .ce-nav-trigger, .menu-item, button, div'))
        .map((element) => ({
          aria: (element.getAttribute('aria-label') || '').trim(),
          text: (element.textContent || '').replace(/\\s+/g, ' ').trim(),
          className: String(element.className || ''),
        }))
        .filter((item) => item.aria || item.text || item.className.includes('ce-nav-trigger'));
      const trigger = document.querySelector('[data-ce-original-export-menu] .ce-nav-trigger');
      const triggerVisible = Boolean(trigger && trigger.isConnected
        && getComputedStyle(trigger).display !== 'none'
        && getComputedStyle(trigger).visibility !== 'hidden'
        && trigger.getBoundingClientRect().width > 0);
      trigger?.click();
      setTimeout(() => {
        const menuText = document.body.innerText || '';
        resolve({
          loaded: window.__codexChatGptExporterLoaded === true,
          hasJsZip: typeof window.JSZip === 'function',
          hasSnapdom: typeof window.snapdom === 'function',
          language: window.localStorage.getItem('codex:chatgpt-exporter:exporter:language'),
          exportAllLimit: window.localStorage.getItem('codex:chatgpt-exporter:exporter:export_all_limit'),
          triggerVisible,
          hasPortugueseMenu: /Copiar texto/.test(menuText)
            && /Captura/.test(menuText)
            && /Markdown/.test(menuText)
            && /HTML/.test(menuText)
            && /Exportar conversas/.test(menuText),
          candidates: getCandidates().slice(0, 20),
        });
      }, 2000);
    }))()
  `, true);

  if (!state.loaded || !state.triggerVisible || !state.hasJsZip || !state.hasSnapdom) {
    throw new Error(`ChatGPT exporter page injection is incomplete: ${JSON.stringify(state)}`);
  }

  if (state.language !== '"pt-BR"' || state.exportAllLimit !== String(CHATGPT_EXPORTER_ALL_LIMIT)) {
    throw new Error(`ChatGPT exporter storage defaults were not applied: ${JSON.stringify(state)}`);
  }

  if (!state.hasPortugueseMenu) {
    throw new Error(`ChatGPT exporter UI did not render in Portuguese: ${JSON.stringify(state)}`);
  }

  console.log(`[exporter-page-test] ${SERVICE.name} ${JSON.stringify({
    source: importResult.source,
    imported: importResult.imported,
    signedIn,
    loaded: state.loaded,
    triggerVisible: state.triggerVisible,
    hasPortugueseMenu: state.hasPortugueseMenu,
    exportAllLimit: CHATGPT_EXPORTER_ALL_LIMIT,
    unlimited: CHATGPT_EXPORTER_ALL_LIMIT === 0,
  })}`);
}

async function runKdeShortcutInstallTest() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatgpt-kde-shortcut-test-'));
  const desktopDir = path.join(baseDir, 'applications');
  const autostartTestDir = path.join(baseDir, 'autostart');
  const shortcutsFile = path.join(baseDir, 'kglobalshortcutsrc');
  const fakeAppImage = path.join(baseDir, 'chatgpt_app.appimage');
  fs.mkdirSync(desktopDir, { recursive: true });
  fs.mkdirSync(path.join(baseDir, '.icons'), { recursive: true });
  fs.writeFileSync(path.join(baseDir, '.icons', 'chatgpt_app'), 'icon');
  fs.writeFileSync(fakeAppImage, '');
  fs.writeFileSync(shortcutsFile, '[services][org.kde.krunner.desktop]\n_launch=Search\\tAlt+F2,Search\\tAlt+F2,KRunner\n\n[services][chatgpt.desktop]\nQuickAsk=Alt+Space,Alt+Space,Abrir mini janela\nPreferences=none,none,Preferencias\n_launch=none,none,ChatGPT App\n');

  process.env.CHATGPT_KDE_DESKTOP_DIR = desktopDir;
  process.env.CHATGPT_KDE_SHORTCUTS_FILE = shortcutsFile;
  process.env.CHATGPT_KDE_DESKTOP_ID = 'chatgpt_app.desktop';
  process.env.CHATGPT_AUTOSTART_DIR = autostartTestDir;
  process.env.CHATGPT_APPIMAGE_PATH = fakeAppImage;
  process.env.CHATGPT_SKIP_KDE_DBUS = '1';
  process.env.CHATGPT_SKIP_CONFIG_BACKUP = '1';

  fs.writeFileSync(path.join(desktopDir, 'chatgpt.desktop'), desktopEntryForShortcut('chatgpt.desktop', fakeAppImage));

  const result = await installKdeQuickAskShortcut();
  const desktopText = fs.readFileSync(path.join(desktopDir, 'chatgpt_app.desktop'), 'utf8');
  const shortcutText = fs.readFileSync(shortcutsFile, 'utf8');

  if (!desktopText.includes(`Icon=${path.join(baseDir, '.icons', 'chatgpt_app')}`) || desktopText.includes('/tmp/.mount_')) {
    throw new Error('Desktop launcher must use a persistent icon.');
  }

  if (fs.existsSync(path.join(desktopDir, 'chatgpt.desktop')) || shortcutText.includes('[services][chatgpt.desktop]')) {
    throw new Error('Legacy launcher still shadows the other desktop application.');
  }

  if (!desktopText.includes(`${fakeAppImage}" --no-sandbox ${TOGGLE_MINI_ARG}`)) {
    throw new Error('Desktop action does not point QuickAsk at the current AppImage.');
  }

  if (fs.existsSync(path.join(desktopDir, 'chatgpt-quickask.desktop'))) {
    throw new Error('Dedicated Quick Ask desktop entry should not exist.');
  }

  if (!desktopText.includes(`X-KDE-Shortcuts=${QUICK_ASK_SHORTCUT}`)) {
    throw new Error('ChatGPT desktop action does not advertise the KDE Alt+Space shortcut.');
  }

  if (shortcutText.includes('[services][chatgpt-quickask.desktop]')) {
    throw new Error('KDE shortcut file should not keep the old dedicated Quick Ask section.');
  }

  if (!shortcutText.includes(`${QUICK_ASK_DESKTOP_ACTION}=${QUICK_ASK_SHORTCUT},${QUICK_ASK_SHORTCUT},Abrir mini janela`)) {
    throw new Error('KDE shortcut file does not contain the Alt+Space ChatGPT QuickAsk action.');
  }
  if (!shortcutText.includes('[services][chatgpt_app.desktop]')) {
    throw new Error('KDE shortcut must belong to the AppImage launcher.');
  }
  if (!findShortcutConflict('[services][other.desktop]\n_launch=Alt+Space,Alt+Space,Other\n', 'chatgpt_app.desktop')) {
    throw new Error('Unrelated shortcut conflicts must remain protected.');
  }

  const otherDesktopPath = path.join(desktopDir, 'chatgpt.desktop');
  const otherDesktopContent = '[Desktop Entry]\nName=ChatGPT\nExec=chatgpt %U\n';
  fs.writeFileSync(otherDesktopPath, otherDesktopContent);
  await installKdeQuickAskShortcut();
  if (fs.readFileSync(otherDesktopPath, 'utf8') !== otherDesktopContent) {
    throw new Error('Repair must not modify the other desktop application.');
  }

  settings.autoStart = true;
  settings.autoStartToTray = true;
  const autostartResult = applyAutostartSetting();
  const autostartText = fs.readFileSync(path.join(autostartTestDir, 'chatgpt.desktop'), 'utf8');
  if (!autostartResult.enabled || !autostartResult.startToTray) {
    throw new Error(`Autostart setting did not report enabled start-to-tray: ${JSON.stringify(autostartResult)}`);
  }
  if (!autostartText.includes(`${fakeAppImage}" --no-sandbox ${START_MINIMIZED_ARG}`)) {
    throw new Error('Autostart desktop entry does not point at the current AppImage with start-minimized.');
  }

  settings.autoStart = false;
  const autostartDisableResult = applyAutostartSetting();
  if (fs.existsSync(path.join(autostartTestDir, 'chatgpt.desktop')) || autostartDisableResult.enabled) {
    throw new Error(`Autostart setting did not remove the desktop entry: ${JSON.stringify(autostartDisableResult)}`);
  }

  console.log(`[kde-shortcut-test] ${SERVICE.name} ${JSON.stringify({
    desktopPath: result.desktopPath,
    shortcutsPath: result.shortcutsPath,
    shortcut: result.shortcut,
    appImagePath: result.appImagePath,
    autostartPath: autostartResult.path,
  })}`);
}

function handleAppCommand(args) {
  if (hasArg(args, INSTALL_KDE_SHORTCUT_ARG)) {
    installKdeQuickAskShortcut()
      .then((result) => {
        console.log(`[${SERVICE.id}] KDE shortcut installed ${JSON.stringify(result)}`);
      })
      .catch((error) => {
        console.error(`[${SERVICE.id}] KDE shortcut install failed`, error);
      });
    return true;
  }

  if (hasArg(args, TOGGLE_MINI_ARG)) {
    toggleMiniWindow();
    return true;
  }

  if (hasArg(args, PREFERENCES_ARG)) {
    createSettingsWindow();
    return true;
  }

  return false;
}

app.on('second-instance', (_event, argv) => {
  if (handleAppCommand(argv)) {
    return;
  }
  showMainWindow();
});

app.on('before-quit', (event) => {
  if (appSession && !quitSessionFlushComplete && !quitAfterSessionFlush) {
    event.preventDefault();
    quitAfterSessionFlush = true;
    flushPersistentSessionData('before-quit')
      .finally(() => {
        quitSessionFlushComplete = true;
        app.quit();
      });
    return;
  }

  isQuitting = true;
  rememberWindowBounds('main', mainWindow);
  rememberWindowBounds('mini', miniWindow);
});

app.on('will-quit', () => {
  closeInstanceCommandServer();
  releaseFileInstanceLock();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || SMOKE_MODE) {
    app.quit();
  }
});

app.on('activate', () => {
  showMainWindow();
});

app.whenReady()
  .then(async () => {
    if (isSecondaryInstance) {
      return;
    }

    nativeTheme.themeSource = 'dark';
    settings = readSettings();
    configureSession();
    setupIpc();
    createApplicationMenu();

    if (KDE_SHORTCUT_TEST_MODE) {
      await runKdeShortcutInstallTest();
      app.exit(0);
      return;
    }

    if (hasArg(process.argv, INSTALL_KDE_SHORTCUT_ARG)) {
      const result = await installKdeQuickAskShortcut();
      console.log(`[${SERVICE.id}] KDE shortcut installed ${JSON.stringify(result)}`);
      app.exit(0);
      return;
    }

    if (IMPORT_TEST_MODE) {
      await runBrowserImportTest();
      app.exit(0);
      return;
    }

    if (MINI_WINDOW_TEST_MODE) {
      await runMiniWindowTest();
      app.exit(0);
      return;
    }

    if (SESSION_PERSISTENCE_TEST_MODE) {
      await runSessionPersistenceTest();
      app.exit(0);
      return;
    }

    if (SESSION_DETACH_TEST_MODE) {
      await runSessionDetachTest();
      app.exit(0);
      return;
    }

    if (SESSION_REPLACE_TEST_MODE) {
      await runSessionReplaceTest();
      app.exit(0);
      return;
    }

    if (SESSION_RELOAD_POLICY_TEST_MODE) {
      runSessionReloadPolicyTest();
      app.exit(0);
      return;
    }

    if (SESSION_COOKIE_CHANGE_TEST_MODE) {
      await runSessionCookieChangeTest();
      app.exit(0);
      return;
    }

    if (EXPORTER_INTEGRATION_TEST_MODE) {
      runExporterIntegrationTest();
      app.exit(0);
      return;
    }

    if (EXPORTER_PAGE_TEST_MODE) {
      await runExporterPageTest();
      app.exit(0);
      return;
    }

    if (SETTINGS_PAGE_TEST_MODE) {
      await runSettingsPageTest();
      app.exit(0);
      return;
    }

    if (SMOKE_MODE) {
      await runSmokeTest();
      app.exit(0);
      return;
    }

    await syncDesktopIntegrationOnStart();

    createTray();
    if (hasArg(process.argv, TOGGLE_MINI_ARG)) {
      showMiniWindow();
    } else if (hasArg(process.argv, PREFERENCES_ARG)) {
      createSettingsWindow();
    } else if (!hasArg(process.argv, START_MINIMIZED_ARG)) {
      showMainWindow();
    }
    flushPendingInstanceArgv();
  })
  .catch((error) => {
    console.error(`[${SERVICE.id}] fatal startup error`, error);
    app.exit(1);
  });
