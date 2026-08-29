
# THITA STORE V17.23.2

Melhoria: a inclusão de itens na Entrada agora possui busca parcial pelo nome do
produto. A busca ignora maiúsculas, minúsculas e acentos; por exemplo, `sam`
encontra todos os nomes que contenham essas três letras.

Correção: o salvamento do rascunho agora começa imediatamente e sua fila continua
ativa durante a troca de telas. Ao voltar para Entrada, a restauração aguarda toda
gravação pendente, inclusive quando a tela foi trocada logo após adicionar um item.

## Rascunho persistente da Entrada

Antes de publicar, execute `V17.23_SQL_RASCUNHO_ENTRADA.sql` uma vez no SQL
Editor do Supabase. O arquivo cria o armazenamento de rascunhos e as funções
protegidas por usuário; não apague tabelas nem repita os scripts anteriores.

A tela Entrada cria ou reutiliza um único rascunho do usuário e salva campos e
itens na nuvem. O conteúdo volta após F5, fechamento do navegador ou acesso em
outro dispositivo com a mesma conta. O rascunho não altera estoque, financeiro
ou auditoria: esses efeitos só acontecem transacionalmente em **Concluir entrada**.
**Cancelar entrada** pede confirmação e encerra o rascunho sem movimentar estoque.

# Histórico anterior — V17.22.1

## Auditoria clara dentro de Ajustes

Esta correção não exige SQL. A opção **Auditoria** foi removida do menu
principal e agora aparece dentro de **Ajustes**, somente para administradores.

O histórico passou a exibir módulo, ação e resumo em linguagem simples. Os
códigos internos ficam ocultos e as informações adicionais só aparecem ao
clicar em **Detalhes**. Os filtros e o arquivo CSV seguem a mesma apresentação.

## Aparência do Catálogo e Banners

Execute `V17.22_SQL.sql` depois de
`V17.21.1_SQL_CORRECAO_PARAMETROS.sql` e publique os arquivos da aplicação.

Administradores passam a encontrar **Cadastros → Aparência e Banners**, onde é
possível trocar a logo e cadastrar campanhas com imagem para computador,
imagem opcional para celular, título, texto, botão, link, período, ordem e
situação ativa. O catálogo alterna automaticamente os banners ativos.

A imagem `public/logo-thita.png` também foi substituída pela nova logo oficial
fornecida para esta versão.

## Auditoria do Sistema

### Correção V17.21.1

Se o `V17.21_SQL.sql` já foi executado, execute em seguida
`V17.21.1_SQL_CORRECAO_PARAMETROS.sql`. A correção restaura os nomes dos
parâmetros esperados pelo Supabase ao editar clientes e nas demais operações
protegidas. Não é necessário publicar novamente a aplicação por causa desta
correção.

Execute `V17.21_SQL.sql` depois da correção
`V17.20.2_SQL_CORRECAO_ACESSO_OPERADOR.sql`.

A V17.21 aplica as permissões dos operadores também nas funções críticas do
Supabase, bloqueia chamadas diretas às funções internas e amplia a cobertura dos
registros de auditoria. Uma nova aba **Auditoria**, exclusiva para
administradores, permite filtrar o histórico por texto, operação e período e
exportar o resultado em CSV.

Depois da atualização, confira:

1. administrador continua acessando todos os módulos;
2. operador acessa somente os módulos liberados;
3. aba Auditoria aparece apenas para administrador;
4. uma venda, entrada ou ajuste novo aparece no histórico;
5. o SQL termina exibindo `administrador_confirmado = true` quando executado em
   uma sessão administrativa do sistema. No SQL Editor esse campo pode aparecer
   como `false`, pois o editor não usa a sessão do usuário do aplicativo.

## Retorno de convite

Convites e recuperações enviados pelo Supabase agora abrem diretamente a tela
para definição da senha no domínio oficial. Esta correção não requer novo SQL.

## Convites e recuperação de acesso

Execute `V17.20_SQL.sql` depois do `V17.19_SQL.sql` e publique a Edge Function
`convidar-usuario` conforme `PUBLICAR_FUNCAO_CONVITE.md`. Convites retornam para
`https://www.thitastore.com.br` e novos perfis começam inativos.

## Usuários, Permissões e Auditoria

Execute `V17.19_SQL.sql` depois do `V17.18_SQL.sql`. Administradores podem
configurar acessos dos usuários existentes e operações sensíveis passam a gerar
registros de auditoria no Supabase.

## Central Financeira

Caixa e Despesas, Crediário e Contas a Pagar foram reunidos na aba Financeiros.
Esta atualização reorganiza somente a interface e não requer novo SQL.

## Central de Cadastros

Clientes, Categorias, Categorias Financeiras, Fornecedores e Produtos foram
reunidos na aba Cadastros. Esta atualização reorganiza somente a interface e não
requer execução de novo SQL.

## Categorias Financeiras

Execute `V17.18_SQL.sql` depois do `V17.17.1_SQL.sql`. O Financeiro passa a usar
categorias cadastradas e ativas. Categorias podem ser fixas ou variáveis,
editadas e desativadas; a exclusão é bloqueada quando já existem lançamentos.

## Despesas futuras e filtro sem duplicação

Execute `V17.17.1_SQL.sql` depois do `V17.17_SQL.sql`. Despesas futuras já
cadastradas são convertidas uma única vez para Contas a Pagar. Novas despesas
podem ser agendadas e parceladas no Financeiro, entrando no caixa somente após o
pagamento. O filtro Operação realizada não repete opções.

## Contas a Pagar

Execute `V17.17_SQL.sql` depois do `V17.16.2_SQL.sql`. Compras em cartão de
crédito ou boleto geram parcelas mensais a partir do primeiro vencimento. A
saída entra no caixa somente quando a parcela é paga. Pagamentos podem ser
desfeitos, e entradas com parcela paga ficam protegidas contra cancelamento.

## Catálogo completo no filtro Operação realizada

O filtro de Relatórios → Movimentações agora exibe sempre todas as operações de
estoque e todas as ações disponíveis na aba Ajustes, mesmo quando uma delas
ainda não possui registros. Esta correção de interface não requer novo SQL.

## Operações completas em Relatórios

Execute `V17.16.2_SQL.sql` depois do `V17.16.1_SQL.sql`. Em Relatórios →
Movimentações, o filtro Operação realizada passa a reconhecer pelo registro real
as entradas, vendas, cancelamentos de entrada, cancelamentos de venda,
devoluções de cliente e ajustes manuais de estoque, inclusive no histórico.

## Entrada de mercadoria integrada ao Financeiro

Execute `V17.16.1_SQL.sql` depois do `V17.16_SQL.sql`. A entrada agora exige a
forma de pagamento e, para cartão de crédito ou boleto, permite informar de 1 a
24 parcelas. Ao confirmar, o estoque é atualizado e o valor total da mercadoria
com o frete aparece automaticamente como saída no Financeiro. O cancelamento da
entrada também cancela esse movimento no fluxo, mantendo o histórico.

## Financeiro e Caixa

Execute `V17.16_SQL.sql` depois do `V17.15.1_SQL.sql`. O fluxo considera vendas
à vista, parcelas recebidas e despesas. Vendas a crediário entram somente no
recebimento da parcela. Filtros e CSV usam o período selecionado.

## Filtro por operação realizada

Na aba Movimentações, combine Produto e Operação realizada para consultar, por
exemplo, somente as entradas de um item. O CSV respeita a combinação aplicada.
Esta atualização não requer SQL adicional.

## Relatórios sintéticos e analíticos

Execute `V17.15.1_SQL.sql` depois do `V17.15_SQL.sql`. Entradas e Saídas mostram
uma linha sintética por operação e o botão Abrir movimentação exibe os itens.
Movimentações passam a mostrar a operação realizada e o motivo quando disponível.

## Cancelamentos, devoluções e ajustes

Execute `V17.15_SQL.sql` depois do `V17.14_SQL.sql`. As operações ficam na aba
Ajustes, exigem motivo e preservam o histórico. Estoque negativo, devolução
acima da venda e cancelamento com parcela paga são bloqueados.

## Dashboard gerencial

Execute `V17.14_SQL.sql` depois do `V17.13_SQL.sql`. O painel mostra vendas do
dia e do mês, lucro estimado, entradas, estoque, reposição, crediário,
desempenho dos últimos sete dias e atividades recentes.

## Crediário

Execute `V17.13_SQL.sql` depois do `V17.12_SQL.sql`. Vendas a crediário permitem
de 1 a 24 parcelas, primeiro vencimento e geração mensal automática. O painel
Crediário mostra parcelas abertas, vencidas e pagas e permite registrar ou
desfazer recebimentos.

## Filtros de Relatórios

Entradas podem ser filtradas por fornecedor; Saídas por cliente; Estoque por
fornecedor e categoria; Movimentações por origem e tipo. Todos também aceitam
período, produto e busca geral. A exportação CSV respeita os filtros aplicados.

Esta atualização não precisa de SQL adicional.

## Clientes + Vendas/Saídas

Execute `V17.12_SQL.sql` depois do `V17.11.1_SQL.sql`.

Inclui cadastro e edição de clientes, venda com vários produtos e tamanhos,
formas de pagamento, desconto, entrega, baixa transacional do estoque e
Relatório de Saídas com filtros e exportação CSV.

## Relatórios

Execute `V17.11.1_SQL.sql` depois do `V17.11_SQL.sql`.

A página Relatórios oferece consulta histórica de entradas, estoque atual e
movimentações, com filtros e exportação CSV. A aba Saídas já está reservada e
será alimentada pelo módulo Vendas/Saídas da V17.12.

## Fornecedores + Entrada de Mercadorias/NF

Execute `V17.11_SQL.sql` uma única vez depois do `V17.10.7_SQL.sql`.

Esta versão inclui cadastro e edição de fornecedores, vínculo obrigatório do
fornecedor no produto e entrada de mercadorias com vários produtos/tamanhos na
mesma nota. A confirmação da entrada grava documento, itens, custo e histórico,
e atualiza o estoque de cada tamanho em uma única transação no Supabase.

O estoque não pode ser informado no cadastro do produto. Ele continua sendo
alterado exclusivamente por uma movimentação rastreável.

## Correção V17.10.7

Execute `V17.10.7_SQL.sql` depois da V17.10.5. O SQL atribui referências
automáticas aos produtos antigos sem SKU e ajusta cadastro/edição para funcionar
sem fornecedor. O campo Fornecedor foi retirado do formulário até a criação do
módulo correspondente.

## Atualização a partir da V17.10.5

1. Execute `V17.10.6_SQL.sql` no SQL Editor do Supabase.
2. Preserve seu arquivo `.env` ao substituir a versão local.
3. Na lista de Produtos, use a lixeira para remover os três registros antigos
   sem SKU. A exclusão só é permitida quando o estoque real é zero.

Nesta versão, Fornecedor é temporariamente opcional porque o módulo ainda não
foi criado. O vínculo poderá ser preenchido ou alterado futuramente.

## Atualização a partir da V17.10.4

1. Abra o Supabase e acesse o SQL Editor.
2. Execute uma única vez o arquivo `V17.10.5_SQL.sql`.
3. Ao final, confira o valor exibido em `proximo_sku_sem_consumir`.
4. Substitua a aplicação pela V17.10.5, preservando seu arquivo `.env` local.

O SKU mostrado no popup é apenas uma prévia do próximo número. Atualizar a
página, trocar de módulo ou cancelar o formulário não consome numeração. O
contador avança atomicamente somente quando o produto é gravado com sucesso.

O cadastro e a edição de produtos agora são abertos pelo botão **Cadastrar
produto** ou pelo botão de edição da lista. Cancelar limpa o formulário e mantém
o mesmo SKU pendente para o próximo cadastro.

## Deploy

## Como colocar na nuvem (Vercel - Grátis)

1. Crie conta em https://vercel.com
2. Clique New Project > Import Git ou Upload
3. Faça upload desta pasta OU conecte GitHub:
   - Crie repositório no GitHub
   - git init, git add ., git commit -m "thita", git push
   - Importe no Vercel
4. Vercel detecta Vite automaticamente
5. Deploy! Link fica: https://seu-projeto.vercel.app

## Alternativa Netlify:
- Arraste a pasta dist (após npm run build) para https://app.netlify.com/drop

## Local:
npm install
npm run dev
