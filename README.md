# ChatGPT App para Linux

Cliente desktop nao oficial para `chatgpt.com`, feito com Electron. Inclui janela principal, janela compacta, integracao com bandeja do sistema e atalhos do KDE, configuracoes persistentes, sessao isolada e exportacao de conversas.

## Funcoes

- Janela compacta acionada pelo atalho configurado no KDE.
- Opcoes de inicializacao, bandeja, zoom, posicao e comportamento das janelas.
- Login na sessao propria do aplicativo, sem compartilhar automaticamente cookies com o navegador.
- Exportador integrado com formatos e importacao de arquivo oficial preservados; sem limite artificial de conversas.
- Organizador local de conversas: pastas, favoritos, busca nas conversas carregadas e notas por conversa. Os dados ficam no armazenamento local do perfil do aplicativo.

O organizador e independente da extensao Superpower ChatGPT. Ele **nao** implementa todas as funcionalidades dessa extensao. A busca cobre somente conversas presentes na barra lateral carregada e conversas fixadas localmente. As pastas locais nao alteram projetos nem pastas remotas do ChatGPT.

## Desenvolvimento

Requisitos: Linux x86_64, Node.js 22 ou superior e `pnpm` 11.

```bash
pnpm install
pnpm test
pnpm build:appimage
```

O pacote resultante fica em `dist/chatgpt_app.AppImage`. Para executar sem instalar:

```bash
chmod +x dist/chatgpt_app.AppImage
./dist/chatgpt_app.AppImage
```

O projeto usa Electron 42.5.0. Se o ambiente de build bloquear scripts de instalacao, autorize explicitamente os scripts necessarios para Electron e seu empacotador conforme a politica do gerenciador; nao desabilite a politica de seguranca globalmente. A compilacao do AppImage requer acesso aos binarios de empacotamento na primeira execucao.

## Instalacao e dados

O AppImage pode ser integrado ao menu pelo Gear Lever. Para substituir uma instalacao existente, feche o aplicativo, faca uma copia do AppImage anterior e substitua apenas o arquivo no mesmo caminho. Nao remova o perfil em `~/.config/ChatGPT App`: ele contem sessao, preferencias e dados locais. A troca do AppImage por si so nao exige apagar cookies nem configuracoes.

O atalho global do KDE usa a acao `QuickAsk` de `chatgpt_app.desktop`, separada do lancador `chatgpt.desktop` de outros aplicativos. Confira em **Configuracoes do sistema > Atalhos > Aplicativos**. O funcionamento de `Alt+Espaco` depende de nao haver conflito com outra acao global.

## Limites e seguranca

O login Google e controlado pelos fluxos externos do Google e do ChatGPT; este projeto nao garante que provedores aceitem um navegador embutido. Nunca publique arquivos do perfil, cookies, tokens ou dumps de sessoes no repositorio. Testes automatizados nao substituem verificacao de login e exportacao com uma conta real.

Este projeto nao e afiliado a OpenAI nem a Superpower ChatGPT. A marca e o servico ChatGPT pertencem aos respectivos titulares.

## Licenca

Codigo deste repositorio sob [MIT](LICENSE). Consulte [atribuicoes de terceiros](THIRD_PARTY.md) para os componentes incorporados e suas licencas.
