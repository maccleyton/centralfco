# Implementação da Central

Entregas locais: Scanner CSV/XLSX com seleção de aba, cabeçalhos multinível, seleção de colunas e registros, pesquisa, filtros por texto/número/data, renomeação para exportação, modelos no navegador, paginação e validação. O Scanner também permite mapear semanticamente os indicadores, identificar oportunidades de crédito, PIX, seguros e consórcio, explicar as evidências, configurar pesos, gerar carteiras priorizadas de 10 a 100 clientes e abrir uma apresentação BI imprimível. Tudo é processado em memória no navegador.

O Pipeline agora é uma área própria. O Scanner transfere operações válidas pelo `sessionStorage` e o Pipeline as incorpora ao SQLite executado em WebAssembly, cujo arquivo é persistido no IndexedDB do navegador. Também é possível criar e editar operações manualmente. A configuração é relacional e condicional: categorias, tipos, fases, responsáveis e campos específicos são tabelas próprias; cada campo pode valer para uma categoria inteira ou apenas para um tipo. A mesma seleção pode ser vista em tabela colunar ou Kanban, com pesquisa, fase e responsável compartilhados entre as duas visões. Nenhuma transição ou SLA é inventado: operações importadas preservam a fase do Lists, enquanto novos cadastros usam apenas as fases configuradas pelo usuário.

## Exportação recebida

21 operações, 20 MCIs distintos, 11 colunas e nenhum número de proposta duplicado. Prazo está vazio em todas as operações. O arquivo inclui o esquema XML do Lists na primeira linha e valores monetários como `R$ 150,000.00`. Não incluir os dados bancários reais em fixtures ou arquivos públicos do repositório.

Tipos observados: Giro FCO (7), FCO Desenv. Comercial (9), FCO Desenv. Turismo (2), Giro Pronampe (1), Alt. Condições Pactuadas (2).

Fases observadas: Em Liberação (5), Em Acolhimento (5), Cancelada (3), Em Análise (2), Liberada (4), Formalizada (1), Em Formalização (1).

Não há CNPJ, identificador do item Lists, histórico de alterações ou data de início da fase atual. Preservar essas ausências; não estimar SLA a partir da data de entrada da operação. CENOP é uma unidade responsável, não uma conta de usuário.

## Arquitetura local adotada

| Entidade | Papel |
| --- | --- |
| Identificação local | Login obrigatório da Central mantém agência, matrícula e responsável durante a sessão |
| Arquivos | CSV e XLSX são lidos em memória e nunca enviados a servidor |
| Consultas e modelos | Colunas e filtros reutilizáveis ficam no armazenamento local do navegador |
| Oportunidades | Regras configuráveis registram a evidência dos indicadores mapeados |
| Carteiras | Ranking e arquivo CSV são gerados localmente; nenhum dado real entra no repositório |
| Evoluções futuras | CRM, tarefas e histórico deverão usar armazenamento local e exportação/importação controlada |

Não há backend, banco remoto, autenticação externa nem assinatura digital planejados para esta versão. O login local da Central permanece essencial para identificar os relatórios. Compartilhamento entre computadores deverá ocorrer por arquivos exportados explicitamente pelo usuário.

## Pendências de produto e entregas seguintes

- Confirmar os fluxos reais de Giro, Investimento e Aditivo; definir transições permitidas e SLA. As etapas exemplificadas na conversa não são regras aprovadas.
- Confirmar produto/modalidade/processo de Alt. Condições Pactuadas e revisar os mapeamentos sugeridos para os demais tipos antes de persistir.
- Acrescentar perfis pré-configurados somente depois de confirmar oficialmente o significado das colunas de cada relatório.
- Implementar histórico local de importações sem conservar dados sensíveis por padrão.
- Evoluir o score configurável e as carteiras para CRM local, follow-ups e dashboards operacional/comercial.
- Evoluir Parecer Express, Comparador de Linhas, Análise de Crédito e Radar do Cliente sobre o domínio compartilhado; não gerar taxas, limites ou decisões oficiais sem fonte e parâmetros verificáveis.

## Verificação

`npm run quality` verifica sintaxe e executa os testes existentes e do parser. Testes do Scanner cobrem esquema, aspas, notas multilinha, delimitadores, rejeição de registros malformados, moeda, datas, duplicidades, ausência de histórico, indicadores booleanos, mapeamentos, regras de oportunidade, evidências e ranking. Os arquivos reais devem ser validados localmente sem copiá-los para o repositório.

## Validação dos relatórios XLSX

Os onze arquivos foram processados pela mesma implementação utilizada na página, sem dependências externas de leitura. Uma extração independente com openpyxl conferiu 4.332 registros e 135.675 posições de células, incluindo valores numéricos, booleanos, textos e ausências. Não houve diferenças. Os dados reais não foram adicionados ao repositório.

| Relatório | Linhas de cabeçalho | Colunas | Registros |
| --- | ---: | ---: | ---: |
| 186 | 1 | 9 | 1968 |
| 2336 | 2 | 37 | 93 |
| 2810 | 4 | 153 | 287 |
| 3160 | 4 | 41 | 286 |
| 3663 | 3 | 47 | 195 |
| 3797 | 2 | 22 | 294 |
| 3821 | 3 | 46 | 286 |
| 4262 | 2 | 19 | 182 |
| 4452 | 3 | 48 | 6 |
| 6793 | 2 | 18 | 325 |
| 7902 | 3 | 50 | 410 |

Cabeçalhos mesclados são propagados apenas dentro de suas mesclagens e combinados em caminhos, como `CASH IN / PIX_IN / VOLUME`. Colunas com o mesmo caminho recebem uma referência de coluna para evitar colisões. Cabeçalhos vazios também recebem uma referência. `MCl` recebe sugestão de nome de exportação `MCI`, preservando a chave de origem. Linhas repetidas por MCI permanecem distintas. A aba e o número da linha original são mantidos pelo parser.

O leitor aceita ZIP armazenado ou deflate, textos compartilhados ou inline, booleanos, números e datas com formatos identificados. Preserva zeros quando registrados em texto ou em formato numérico de zeros. Resultados salvos de fórmulas não são recalculados; o leitor mostra aviso. A integridade das entradas XML é verificada por CRC32. Arquivos protegidos, entidades externas e compressões não suportadas são rejeitados. Limites: arquivo de 5 MB, XML descompactado de 40 MB, 10.000 linhas por aba, 512 colunas; interface limitada a 5.000 registros e páginas de 50.

Filtros são combinados com AND. Filtrar altera os resultados visíveis, sem remover automaticamente registros já selecionados; os botões de seleção agem sobre todos os resultados, incluindo outras páginas. O contador informa separadamente visíveis e selecionados. Para exportar apenas um grupo, desmarque os registros e selecione os resultados filtrados. Modelos guardam colunas, nomes, intervalo de cabeçalho, filtros, mapeamento semântico, limites, pesos e tamanho da carteira no armazenamento local do navegador. Não guardam os registros.

`npm run quality` valida também o contrato visual e funcional das páginas Scanner, BI e Pipeline, além dos filtros, agrupamentos e totais compartilhados pelas visões colunar e Kanban. Os testes geram XLSX sintéticos com ZIP armazenado/deflate e verificam cabeçalhos, múltiplas abas, zeros, datas, percentuais, valores negativos, repetição de MCI, fórmulas salvas, corrupção, mapeamentos e ranking. Compatibilidade de XLSX depende de suporte a `DecompressionStream('deflate-raw')`; há mensagem de atualização do navegador quando indisponível. CSV permanece independente desse recurso.
