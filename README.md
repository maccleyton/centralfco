# Central FCO

Versão integralmente executada no navegador. O preenchimento, as regras de cálculo, a lista de agências e a geração dos relatórios não dependem de servidor Python.

## Execução

Publique esta pasta em qualquer hospedagem de arquivos estáticos e abra `index.html`.

Para testar localmente, use qualquer servidor HTTP estático. Abrir diretamente pelo protocolo `file://` pode bloquear a consulta de CNPJ e o carregamento da logo por regras de segurança do navegador.

## Geração

O botão **Gerar Relatórios** abre o dossiê A4 em uma aba temporária, pronta para imprimir ou salvar como PDF. Nenhuma cópia HTML é baixada; o conteúdo permanece somente na memória do navegador e é descartado ao fechar a aba ou o navegador. A proposta de investimento e a proposta de capital de giro são mutuamente exclusivas conforme o tipo informado.

A consulta de CNPJ usa a BrasilAPI como fonte principal e a API pública CNPJá como fallback automático. A verificação do Simples Nacional consulta as duas fontes até obter um indicador conclusivo. Se nenhuma consulta estiver disponível, a Central apresenta a orientação sobre o papel BLOGS e permite cadastrar manualmente a razão social, o tipo de sociedade e o endereço. Ambas requerem conexão com a internet, podem apresentar defasagem e dependem de permissão de CORS no navegador.

## Relatórios e ferramentas

O botão **Declarações** abre os formulários de residência, renda, NIF e SCR. Quando a consulta do CNPJ confirma que a empresa é optante pelo Simples Nacional, a declaração correspondente é incluída automaticamente no dossiê do FCO. O botão **Relatórios** reúne o tutorial do FCO, as regras de linhas e prazos, o compactador local de PDF e a consulta completa de CNPJ, incluindo quadro societário, dirigentes e situação do Simples Nacional.
