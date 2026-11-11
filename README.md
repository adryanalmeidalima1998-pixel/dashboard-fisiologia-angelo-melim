# Ângelo Melim — Fisiologia & Performance

Dashboard com login pessoal e seleção de temporada:

- **2026 · Grêmio Novorizontino**: histórico, preto e amarelo.
- **2027 · Americano Futebol Clube**: dados próprios, preto e branco.

## Publicação pelo navegador

A configuração é feita nos sites do **GitHub, Neon e Vercel**. Não é necessário instalar programas, executar PowerShell, gerar hash ou rodar scripts no computador.

### 1. GitHub

Extraia o ZIP e envie o conteúdo da pasta `dashboard-angelo-melim` ao repositório do dashboard existente. O `package.json` deve ficar na raiz.

Pelo site do GitHub, use **Add file → Upload files** e confirme em **Commit changes**. Faça o envio em duas etapas:

1. Arquivos da raiz e pastas `components`, `hooks`, `lib`, `public`, `scripts` e `tests`.
2. Pasta `app`.

Use o mesmo repositório já conectado à Vercel. Não envie o ZIP como único arquivo e não envie credenciais para o GitHub. A pasta `scripts` faz parte do código; você não precisa executar seus arquivos.

### 2. Neon

Abra o projeto e o banco que já guardam os registros do dashboard. Preserve esse banco para manter o histórico.

1. Faça um backup ou uma cópia de segurança do banco atual.
2. Abra `schema.sql` do ZIP em um editor de texto e copie o conteúdo.
3. No Neon, abra o **SQL Editor**, confira o banco selecionado e execute esse conteúdo.

O SQL prepara as tabelas sem remover registros. As tabelas atuais de 2026 continuam no schema `public`. O Americano usa `season_2027_americano`.

Na opção de conexão do Neon, use a connection string com **pooling** para `POSTGRES_URL`. Se essa variável já funciona no projeto da Vercel, mantenha o valor atual.

Um banco novo começa sem o histórico. Os registros do banco não estão incluídos no ZIP.

### 3. Vercel

Abra o projeto atual em **Settings → Environment Variables**. Cadastre para **Production**:

| Nome | Valor |
|---|---|
| `DASHBOARD_USERNAME` | `angelo.melim` ou outro usuário escolhido |
| `DASHBOARD_PASSWORD` | Senha escolhida, com pelo menos 12 caracteres |
| `NEXTAUTH_SECRET` | Segredo longo e aleatório, diferente da senha de login |
| `NEXTAUTH_URL` | URL principal do dashboard, com `https://`, sem `/login` no final |
| `POSTGRES_URL` | Conexão pooled do banco atual no Neon |

Cadastre a senha e os segredos somente nas variáveis privadas da Vercel. Não use prefixo `NEXT_PUBLIC_`. Não há senha padrão embutida no código.

**Não precisa criar `DASHBOARD_PASSWORD_HASH`.** Essa variável só é mantida por compatibilidade com a edição anterior. Quando `DASHBOARD_PASSWORD` está preenchida, ela tem prioridade. Alterar o usuário ou a senha invalida as sessões anteriores.

No projeto Vercel, o framework é **Next.js**, o build é `npm run build` e a saída fica no padrão do framework. A raiz é a pasta que contém `package.json`. O próprio serviço instala as dependências e executa o build.

Depois de salvar as variáveis, abra **Deployments → Redeploy** e aguarde **Ready**. Se ainda não existe projeto Vercel, importe o repositório, obtenha a URL principal, configure as variáveis e faça um novo deployment.

### 4. Conferência

1. Acesse o endereço principal e entre com o usuário e a senha cadastrados na Vercel.
2. Selecione 2026 e confira o histórico.
3. Use **Trocar temporada**, abra 2027 e confira a identidade do Americano.
4. Confira que os registros de uma temporada não aparecem na outra.
5. Em **Americano → Configurações**, conecte a planilha própria de bem-estar publicada em CSV, mantendo as colunas e escalas do formulário original.
6. Confira um relatório e uma gravação de dados antes de liberar o acesso ao usuário final.

## Fontes e armazenamento

GPS: importação de CSV Catapult. Atletas, lesões e CMJ: formulários do sistema. A fonte original de bem-estar permanece vinculada apenas a 2026. O Americano começa sem uma planilha configurada. Os valores iniciais opcionais `WELLNESS_URL_2026` e `WELLNESS_URL_2027` podem ser definidos na Vercel; uma fonte salva pela interface tem prioridade.

A planilha publicada no Google Sheets fica acessível a quem possuir o link. Use a fonte de acordo com a gestão dos dados dos atletas.

As APIs verificam a sessão e a temporada. As operações usam o schema selecionado, inclusive atualizações e exclusões. Não há retorno ao schema legado se faltar uma tabela do Americano.

Fotos personalizadas, RTP, decisão clínica, ajustes de minutagem e exclusões semanais continuam salvos no navegador, agora separados por temporada. Não sincronizam automaticamente entre dispositivos. Mantenha o mesmo domínio e navegador para recuperar os dados locais de 2026; as chaves antigas são copiadas sem serem apagadas.

## Linguagem da interface

Usar linguagem técnica e operacional em todas as páginas, relatórios, notificações e estados vazios. Não utilizar slogans, frases motivacionais ou chamadas comerciais.

## Verificação da entrega

O build de produção e os 25 testes automatizados passaram no ambiente de desenvolvimento. Os testes usam dados fictícios e verificam o acesso, as duas formas de configurar senha, a separação de temporadas e a preservação do histórico legado. O banco e a hospedagem reais não foram alterados nesta entrega. O fluxo completo com os dados reais deve ser conferido depois do deployment.
