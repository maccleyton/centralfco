# Implementação da Central

Primeira entrega: Scanner CSV com seleção de colunas e registros, pesquisa, renomeação para exportação, validação e prévia Kanban das fases do Lists. Os arquivos são processados em memória. Não há importação no Supabase nesta entrega.

## Exportação recebida

21 operações, 20 MCIs distintos, 11 colunas e nenhum número de proposta duplicado. Prazo está vazio em todas as operações. O arquivo inclui o esquema XML do Lists na primeira linha e valores monetários como `R$ 150,000.00`. Não incluir os dados bancários reais em fixtures ou arquivos públicos do repositório.

Tipos observados: Giro FCO (7), FCO Desenv. Comercial (9), FCO Desenv. Turismo (2), Giro Pronampe (1), Alt. Condições Pactuadas (2).

Fases observadas: Em Liberação (5), Em Acolhimento (5), Cancelada (3), Em Análise (2), Liberada (4), Formalizada (1), Em Formalização (1).

Não há CNPJ, identificador do item Lists, histórico de alterações ou data de início da fase atual. Preservar essas ausências; não estimar SLA a partir da data de entrada da operação. CENOP é uma unidade responsável, não uma conta de usuário.

## Modelo a implementar após inspecionar o Supabase

| Entidade | Papel |
| --- | --- |
| Equipes e membros | Acesso compartilhado apenas para membros autorizados |
| Clientes | MCI como identificador textual; CNPJ opcional; cadastro permanente |
| Produtos e modalidades | Linha separada de modalidade e processo |
| Processos e etapas | Fluxos versionados por processo; SLA configurável |
| Operações | Cliente, proposta, carteira, valor, responsável, datas e etapa atual |
| Histórico de operação | Eventos futuros com autor e instante; evento de migração separado |
| Importações e registros | Origem, hash, seleção, mapeamento, erros e dados originais |
| Indicadores | Snapshots datados por cliente e importação |
| Consultas e modelos | Mapeamentos de colunas e filtros reutilizáveis |
| Oportunidades | Regras configuráveis e evidência dos indicadores utilizados |
| Carteiras e membros | Seleção de clientes, score e estado comercial |
| Tarefas e interações | Follow-ups, pendências, próximas ações e histórico CRM |

Próximos passos: inspecionar schema existente e Auth, criar migrations pelo CLI, implementar RLS e testes de acesso entre membros e não membros, depois importação transacional idempotente. Usar UUIDs de equipe nas relações e validar que cliente, operação, etapa e carteira pertencem à equipe correta. Histórico não deve ser editável pelo cliente web. Não usar identificação local por matrícula como autenticação do banco. Consultar [documentação de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

A conexão Supabase retornou `projects: []` em 15/09/2026. Não foi possível inspecionar ou alterar banco, Auth ou políticas. A integração cloud ainda está bloqueada por acesso ao projeto.

## Pendências de produto e entregas seguintes

- Confirmar os fluxos reais de Giro, Investimento e Aditivo; definir transições permitidas e SLA. As etapas exemplificadas na conversa não são regras aprovadas.
- Confirmar produto/modalidade/processo de Alt. Condições Pactuadas e revisar os mapeamentos sugeridos para os demais tipos antes de persistir.
- Implementar XLSX, escolha de planilha, modelos de importação, filtros tipados e consultas salvas.
- Implementar autenticação, persistência compartilhada, transições atômicas com histórico, cadastro de operações e follow-ups.
- Implementar snapshots, oportunidades, score configurável, carteiras, CRM e dashboards operacional/comercial.
- Evoluir Parecer Express, Comparador de Linhas, Análise de Crédito e Radar do Cliente sobre o domínio compartilhado; não gerar taxas, limites ou decisões oficiais sem fonte e parâmetros verificáveis.

## Verificação

`npm run quality` verifica sintaxe e executa os testes existentes e do parser. Testes do Scanner cobrem esquema, aspas, notas multilinha, delimitadores, rejeição de registros malformados, moeda, datas, duplicidades e ausência de histórico. O CSV real deve ser validado localmente sem copiá-lo para o repositório. Ainda é necessária validação visual da página e testes de banco quando o acesso estiver disponível.
