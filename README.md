# Central FCO

Versão integralmente executada no navegador. O preenchimento, as regras de cálculo, a lista de agências e a geração dos relatórios não dependem de servidor Python.

## Execução

Publique esta pasta em qualquer hospedagem de arquivos estáticos e abra `index.html`.

Para testar localmente, use qualquer servidor HTTP estático. Abrir diretamente pelo protocolo `file://` pode bloquear a consulta de CNPJ e o carregamento da logo por regras de segurança do navegador.

## Geração

O botão **Gerar Relatórios** abre uma versão A4 pronta para imprimir ou salvar como PDF e também baixa uma cópia HTML autônoma. A proposta de investimento e a proposta de capital de giro são mutuamente exclusivas conforme o tipo informado.

A consulta de CNPJ usa a BrasilAPI como fonte principal e a API pública CNPJá como fallback automático. Ambas requerem conexão com a internet e permissão de CORS no navegador.

## Relatórios e ferramentas

O botão **Relatórios** abre os formulários NIF e SCR, o tutorial do FCO, as regras de linhas e prazos, o compactador local de PDF e a consulta completa de CNPJ com quadro societário e dirigentes.
