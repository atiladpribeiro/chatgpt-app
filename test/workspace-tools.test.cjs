const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../workspace-tools.js'), 'utf8');

function page() {
  const dom = new JSDOM('<!doctype html><html><head></head><body><nav><a href="/c/first">Primeira conversa</a><a href="/c/second">Segunda conversa</a></nav></body></html>', {
    url: 'https://chatgpt.com/c/first',
    runScripts: 'outside-only',
  });
  dom.window.crypto.randomUUID = () => 'folder-1';
  dom.window.confirm = () => true;
  dom.window.eval(source);
  dom.window.document.querySelector('#cw-launch').click();
  return dom;
}

test('organiza conversas e persiste pasta, nota e favorito', () => {
  const dom = page();
  const { document, localStorage, Event } = dom.window;
  const input = document.querySelector('input[placeholder="Nome da pasta"]');
  input.value = 'Trabalho';
  document.querySelector('#cw-panel button[title="Adicionar"]').click();
  const select = document.querySelector('#cw-panel select');
  select.value = 'folder-1';
  select.dispatchEvent(new Event('change'));
  const note = document.querySelector('#cw-panel textarea');
  note.value = 'Nota privada';
  note.dispatchEvent(new Event('input'));
  document.querySelector('#cw-panel button[title="Fixar conversa"]').click();
  const saved = JSON.parse(localStorage.getItem('chatgpt-app:workspace:v1'));
  assert.equal(saved.folders[0].name, 'Trabalho');
  assert.equal(saved.assignments['/c/first'], 'folder-1');
  assert.equal(saved.notes['/c/first'], 'Nota privada');
  assert.equal(saved.pins['/c/first'], 'Primeira conversa');
  dom.window.close();
});

test('busca local, ignora links externos e nao injeta duas vezes', () => {
  const dom = page();
  const { document, Event } = dom.window;
  document.querySelector('nav').insertAdjacentHTML('beforeend', '<a href="https://evil.example/c/fake">Externo</a>');
  document.querySelector('#cw-panel button[title="Atualizar lista"]').click();
  assert.equal(document.querySelectorAll('#cw-panel .cw-chat').length, 2);
  const search = document.querySelector('#cw-panel input[type="search"]');
  search.value = 'segunda';
  search.dispatchEvent(new Event('input'));
  assert.equal(document.querySelectorAll('#cw-panel .cw-chat').length, 1);
  dom.window.eval(source);
  assert.equal(document.querySelectorAll('#cw-launch').length, 1);
  dom.window.close();
});

test('troca a nota exibida apos navegacao interna', () => {
  const dom = page();
  const { document, Event } = dom.window;
  const note = document.querySelector('#cw-panel textarea');
  note.value = 'Nota da primeira';
  note.dispatchEvent(new Event('input'));
  dom.window.history.pushState({}, '', '/c/second');
  dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
  assert.equal(document.querySelector('#cw-panel textarea').value, '');
  dom.window.history.pushState({}, '', '/c/first');
  dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));
  assert.equal(document.querySelector('#cw-panel textarea').value, 'Nota da primeira');
  dom.window.close();
});

test('exportador permanece como arquivo independente e sem limite padrao', () => {
  const exporter = fs.readFileSync(path.join(__dirname, '../chatgpt-exporter.user.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  assert.match(exporter, /defaultExportAllLimit = 0/);
  assert.match(exporter, /Export from official export file/);
  assert.match(main, /injectChatGptExporter\(win\)/);
  assert.match(main, /injectWorkspaceTools\(win\)/);
});
