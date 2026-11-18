# Minha Loja — estoque, vendas e fiado

Aplicativo web responsivo para celular e computador, com acesso familiar por contas individuais. Usa React + Vite, Supabase Auth e PostgreSQL com Row Level Security (RLS).

## O que está incluído

- Login e criação de conta por e-mail e senha.
- Criação de uma loja e convite de familiares por código.
- Cadastro de produtos das marcas O Boticário, Natura, Avon e Jequiti.
- Entradas e saídas manuais de estoque.
- Registro de venda de um produto por vez, com baixa automática do estoque.
- Cadastro de clientes.
- Controle de valores pendentes e recebimentos parciais.
- Resumo do estoque e valores a receber.
- Banco de dados compartilhado entre os membros da mesma loja.

## 1. Criar o projeto Supabase

1. Acesse https://supabase.com/ e crie uma conta.
2. Crie um projeto chamado `minha-loja` e defina uma senha forte para o banco.
3. Abra **SQL Editor** no painel do projeto.
4. Abra o arquivo `supabase/schema.sql` deste pacote, copie todo o conteúdo e execute no SQL Editor.
5. No painel do Supabase, abra **Project Settings / API** ou **Connect** e copie:
   - Project URL
   - Publishable key (ou anon/public key, se o painel ainda mostrar esse nome)
6. Em **Authentication / URL Configuration**, depois de publicar, configure o Site URL com o endereço da Vercel. Durante o teste, você pode manter o endereço local.

> Nunca coloque a `service_role` key no aplicativo ou na Vercel. O frontend usa somente a chave pública (publishable/anon); as tabelas estão protegidas por RLS.

## 2. Preparar o arquivo de configuração

1. Faça uma cópia do arquivo `.env.example` e chame-a `.env.local`.
2. Preencha com os dados do Supabase:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

Não publique nem envie o arquivo `.env.local` para repositórios públicos. Ele já está ignorado pelo Git.

## 3. Publicar gratuitamente na Vercel usando GitHub

1. Crie uma conta em https://github.com/ e entre.
2. Crie um repositório novo, por exemplo `minha-loja`. Selecione **Private**.
3. Envie os arquivos deste pacote descompactado para o repositório. Não envie `.env.local`.
4. Acesse https://vercel.com/ e crie uma conta usando GitHub.
5. Clique em **Add New → Project**, importe o repositório `minha-loja`.
6. A Vercel normalmente detecta Vite automaticamente. Confira:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = URL do projeto Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = chave pública do Supabase
8. Clique em **Deploy**. Ao terminar, a Vercel mostrará o endereço público do aplicativo.

## 4. Configurar login e convidar a família

1. No Supabase, em **Authentication → URL Configuration**, coloque o endereço publicado da Vercel em **Site URL** e salve.
2. Em **Authentication → Providers → Email**, mantenha habilitado o login por e-mail. Para simplificar o primeiro teste, você pode desativar temporariamente a confirmação de e-mail; para uso real, recomendamos mantê-la ativada.
3. Abra o endereço publicado. A primeira pessoa (sua mãe, por exemplo) cria a conta e confirma o e-mail, se solicitado.
4. Entre e crie a loja `Minha Loja`.
5. O aplicativo exibirá um código de convite. Copie e envie somente aos familiares autorizados.
6. Cada familiar abre o mesmo endereço, cria sua própria conta e informa o código para entrar na loja compartilhada.

## 5. Teste antes de usar de verdade

- Cadastre um produto de teste com quantidade pequena.
- Registre uma venda e confirme que a quantidade diminuiu.
- Registre uma venda fiada, depois um recebimento parcial e confira o saldo.
- Entre com uma segunda conta familiar e confirme que ela vê os mesmos registros.
- Exclua os dados de teste antes de começar a operação real.

## Desenvolvimento local (opcional)

Requer Node.js LTS instalado.

```bash
npm install
npm run dev
```

Abra o endereço local exibido pelo Vite. Para gerar a versão de produção:

```bash
npm run build
```

## Observações e limites desta primeira versão

- O aplicativo registra uma linha de produto por venda. Para vender vários itens em um mesmo cupom, será necessária uma evolução do módulo de vendas.
- A tela de vendas fiadas aceita recebimentos parciais, mas não inclui vencimento, juros, lembretes ou impressão de recibo.
- A lista de vendas não é uma contabilidade formal e não substitui emissão fiscal.
- O convite é compartilhado por código. Quem tiver o código poderá entrar na loja; compartilhe-o apenas com pessoas autorizadas. Se suspeitar de divulgação indevida, solicite a rotação do código no banco antes de continuar.
- Faça backup periódico no Supabase. O plano gratuito tem limites e condições que podem mudar; consulte a página de preços.
- O projeto ainda precisa ser configurado nas contas Supabase, GitHub e Vercel do proprietário. Este pacote não cria contas nem publica automaticamente o site.

## Links oficiais

- Supabase: https://supabase.com/
- Supabase React quickstart: https://supabase.com/docs/guides/auth/quickstarts/react
- Vercel: https://vercel.com/
- Vercel + Vite: https://vercel.com/docs/frameworks/frontend/vite
