# Central Empresas

Versão integralmente executada no navegador. O preenchimento, as regras de cálculo, a lista de agências e a geração dos relatórios não dependem de servidor Python.

## Execução

Publique esta pasta em qualquer hospedagem de arquivos estáticos e abra `index.html`.

Para testar localmente, use qualquer servidor HTTP estático. Abrir diretamente pelo protocolo `file://` pode bloquear a consulta de CNPJ e o carregamento da logo por regras de segurança do navegador.

## Geração

O botão **Gerar Relatórios** abre o dossiê A4 no visualizador temporário, pronto para imprimir ou salvar como PDF. Nenhuma cópia HTML é baixada; o conteúdo permanece somente na memória e expira após cinco minutos. A proposta de investimento e a proposta de capital de giro são mutuamente exclusivas conforme o tipo informado.

A consulta de CNPJ usa a BrasilAPI como fonte principal e a API pública CNPJá como fallback automático. A verificação do Simples Nacional consulta as duas fontes até obter um indicador conclusivo. Se nenhuma consulta estiver disponível, a Central apresenta a orientação sobre o papel BLOGS e permite cadastrar manualmente a razão social, o tipo de sociedade e o endereço. Ambas requerem conexão com a internet, podem apresentar defasagem e dependem de permissão de CORS no navegador.

## Cadastro compartilhado

As consultas cadastrais alimentam um registro único local. A última empresa consultada pode ser reaproveitada na proposta, no faturamento, nas declarações e nos documentos dos Correios. Apenas dados cadastrais são guardados por até sete dias; valores, garantias e condições da proposta não são persistidos nesse registro.

## Relatórios, crédito e ferramentas

O botão **Utilitários** reúne o compactador local de PDF, faturamento e documentos dos Correios. **Autorizações e Declarações** contém residência, renda, NIF e SCR. Quando a consulta do CNPJ confirma que a empresa é optante pelo Simples Nacional, a declaração correspondente é incluída automaticamente no dossiê do FCO. **Linhas de Crédito** apresenta catálogo versionado, classificação das fontes, triagem preliminar e apenas os cálculos que possuem fórmula documentada.

## Qualidade

Use `npm run quality` para verificar a sintaxe e executar os testes automatizados. O mesmo comando é executado no GitHub a cada alteração enviada para `main` e em propostas de alteração.

## Redação e Automação

A Área de Trabalho 06 oferece composição por blocos, modelos de Ofício, Memorando, Parecer, Relatório, Portaria e Autorização de Faturamento, listas em níveis, checklists e tabelas com somatórios. Na autorização, o vendedor pode ser consultado pelo CNPJ e o endereço de faturamento permanece editável para filiais. O rascunho permanece no navegador e o documento final usa o visualizador temporário da Central.
