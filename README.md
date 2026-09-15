# Central Empresas

Aplicação 100% frontend, integralmente executada no navegador. Preenchimento, armazenamento, regras de cálculo, lista de agências, simulações e geração de documentos não dependem de backend.

## Execução

Publique esta pasta em qualquer hospedagem de arquivos estáticos e abra `index.html`.

Não existe rota `/api`, banco de dados remoto, segredo de aplicação ou serviço intermediário obrigatório. As consultas externas permitidas usam somente endpoints públicos sem chave e com acesso direto pelo navegador; quando indisponíveis, o preenchimento local continua disponível.

O login local da Central e o controle de sessão permanecem obrigatórios porque identificam agência, matrícula e responsável nos relatórios. A aplicação não implementa login em serviços externos, integrações protegidas nem assinatura digital. Os documentos mantêm apenas os espaços de assinatura manual exigidos pelos modelos impressos.

Para testar localmente, use qualquer servidor HTTP estático. Abrir diretamente pelo protocolo `file://` pode bloquear a consulta de CNPJ e o carregamento da logo por regras de segurança do navegador.

## Geração

O botão **Gerar Relatórios** abre o dossiê A4 no visualizador temporário, pronto para imprimir ou salvar como PDF. Nenhuma cópia HTML é baixada; o conteúdo permanece somente na memória e expira após cinco minutos. A proposta de investimento e a proposta de capital de giro são mutuamente exclusivas conforme o tipo informado.

A consulta de CNPJ usa a BrasilAPI como fonte principal e a API pública CNPJá como fallback automático. A verificação do Simples Nacional consulta as duas fontes até obter um indicador conclusivo. Se nenhuma consulta estiver disponível, a Central permite cadastrar manualmente a razão social, o tipo de sociedade e o endereço. Ambas requerem conexão com a internet, podem apresentar defasagem e dependem de permissão de CORS no navegador.

## Cadastro compartilhado

As consultas cadastrais alimentam um registro único local. A última empresa consultada pode ser reaproveitada na proposta, no faturamento, nas declarações e nos documentos dos Correios. Apenas dados cadastrais são guardados por até sete dias; valores, garantias e condições da proposta não são persistidos nesse registro.

## Relatórios, crédito e ferramentas

O botão **Utilitários** reúne o compactador local de PDF, faturamento e documentos dos Correios. **Autorizações e Declarações** contém residência, renda, NIF e SCR. Quando a consulta do CNPJ confirma que a empresa é optante pelo Simples Nacional, a declaração correspondente é incluída automaticamente no dossiê do FCO. **Linhas de Crédito** apresenta catálogo versionado, classificação das fontes, triagem preliminar e apenas os cálculos que possuem fórmula documentada. As simulações podem ser nomeadas, salvas e recuperadas no próprio navegador, e o comparativo completo pode ser impresso ou salvo em PDF com os cronogramas de cada cenário.

## Qualidade

Use `npm run quality` para verificar a sintaxe e executar os testes automatizados. O mesmo comando é executado no GitHub a cada alteração enviada para `main` e em propostas de alteração.

## Redação e Automação

A Área de Trabalho 06 oferece composição por blocos, modelos de Ofício, Memorando, Parecer, Relatório, Portaria e Autorização de Faturamento, listas em níveis, checklists e tabelas com somatórios. Na autorização, o vendedor pode ser consultado pelo CNPJ e o endereço de faturamento permanece editável para filiais. O rascunho permanece no navegador e o documento final usa o visualizador temporário da Central.

## Scanner de relatórios

Abra `scanner.html` pelo Hub. Aceita CSV comum, CSV com esquema Microsoft Lists e XLSX. Para Excel, confira a aba, a primeira linha e a quantidade de linhas do cabeçalho detectado. Escolha as colunas, renomeie para exportação e selecione os registros. A pesquisa e os filtros não descartam registros selecionados: use os botões para ajustar a seleção dos resultados.

Modelos de colunas e filtros podem ser salvos neste navegador. Registros dos relatórios permanecem em memória. Nos relatórios comerciais, confirme quais colunas representam MCI, cliente e indicadores; o Scanner identifica oportunidades de crédito, PIX, seguros e consórcio, mostra a evidência de cada regra, gera uma carteira priorizada em CSV e uma apresentação BI imprimível. Siglas e campos ausentes nunca são interpretados automaticamente.

O **Pipeline** é uma área separada do Scanner. As operações válidas podem ser recebidas do Scanner ou cadastradas diretamente e são persistidas em um banco SQLite/WASM armazenado no IndexedDB do navegador. O cadastro é condicional: categorias como Investimento, Giro e Aditivo possuem tipos, fases e campos próprios configuráveis. A mesma carteira pode ser acompanhada na visão colunar ou no Kanban, com pesquisa e filtros compartilhados. As fases importadas são preservadas; movimentações automáticas e SLA permanecem desabilitados enquanto os fluxos oficiais não forem confirmados. Não há backend nem autenticação externa.

Os XLSX são processados localmente, sem envio de arquivos ou carregamento de bibliotecas externas. Precisam de navegador com suporte a descompressão `deflate-raw`; CSV continua disponível nos demais. Consulte `docs/central-implementation.md` para limites, validações e próximos módulos.
