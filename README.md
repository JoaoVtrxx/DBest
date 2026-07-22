# DBest Web

Porta para o navegador do **DBest**, o motor de execução de planos de consulta
(álgebra relacional) usado nas aulas do Prof. Sergio Mergen. A ideia é oferecer a
mesma experiência do aplicativo desktop — montar um plano de consulta arrastando
operadores e executá-lo — só que na web, **sem reescrever o motor**: o backend
reaproveita o `dbest-core` original e o expõe por uma API REST.

Projeto original (desktop): <https://github.com/mergen-sergio/DBest>.
Esta versão web é um trabalho de aluno e está em estágio **beta**: o ciclo
principal funciona de ponta a ponta, mas a paleta de operadores é propositalmente
enxuta (veja _Limitações_).

## O que dá para fazer

- Importar tabelas em CSV, XML, BTree (`.dat`, opcionalmente com seu `.head`) e em memória, pelo menu **File**.
- Montar um plano no canvas com os operadores **Filter, Projection, Sort e Limit**,
  ligando as tabelas e operadores por arestas.
- Executar o plano e navegar pelo resultado paginado.
- **Comparar planos**: marque o nó de saída de cada plano e abra o _Comparator_
  para ver, lado a lado, as métricas de custo que o desktop mostra (tuplas lidas,
  blocos acessados/carregados/salvos, comparações de filtro, uso de memória,
  chamadas `next`, buscas por chave primária, registros lidos, tuplas ordenadas).
- Exportar o resultado de um plano como uma nova tabela (BTree), CSV ou SQL.
- Salvar e recarregar a sessão (tabelas + canvas) como um arquivo JSON local.
- Desfazer/refazer (`Ctrl+Z` / `Ctrl+Y`).

## Arquitetura

O repositório é um monorepo Maven com três módulos:

| Módulo       | Papel                                                                                  | Stack                                                 |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `dbest-core` | Motor de execução original (desktop). **Código do professor** — não deve ser alterado. | Java 17, Swing, mxGraph, ANTLR                        |
| `dbest-api`  | Camada REST fina que embrulha o `dbest-core` e o expõe por HTTP.                       | Spring Boot 3.2.5, Java 17                            |
| `dbest-web`  | Frontend: canvas de operadores, modais de import e visualização de resultados.         | Next.js 14, React 18, TypeScript, React Flow, Zustand |

O fluxo de uma consulta:

1. No `dbest-web`, o usuário monta o grafo no canvas (React Flow). O estado vive em
   `src/store/useCanvasStore.ts`.
2. Ao executar, `src/lib/querySerializer.ts` percorre o grafo a partir do nó
   escolhido e serializa para JSON (`{ rootNodeId, nodes, edges }`).
3. `src/lib/api.ts` faz `POST /api/query/execute`.
4. No `dbest-api`, `QueryBuilderService.buildOperation(...)` traduz esse JSON numa
   árvore de `ibd.query.Operation` do core.
5. `TuplesExtractor.getAllRowsList(...)` executa a árvore; o controller pagina e
   devolve as linhas.

O contrato entre os dois lados são as **strings de tipo de operador** (`"FILTER"`,
`"PROJECTION"`, …) e o formato dos `arguments`. Ao mexer num lado, ajuste o outro:
`mapArgumentsToRecord()` (TypeScript) precisa casar com o `switch (opType)` do
`QueryBuilderService` (Java).

## Como rodar

Pré-requisitos: **JDK 17+** (testado com 17 e 21), **Maven 3.9+**, **Node 18+**.
No Windows, habilite caminhos longos antes de clonar, senão o build do core falha:

```bash
git config --system core.longpaths true
```

**1. Compilar o backend** (core + api), a partir da raiz:

```bash
mvn -DskipTests install
```

> Use `-DskipTests`: carregar o `dbest-core` sobe uma thread AWT não-daemon, então
> o JVM dos testes não encerra e o build trava (veja _Limitações_).

**2. Subir a API** (porta 8080):

```bash
mvn -pl dbest-api spring-boot:run
# ou, com o jar já compilado:
java -jar dbest-api/target/dbest-api-0.0.1-SNAPSHOT.jar
```

No Windows, garanta que o `java` em uso é o JDK 17+ (o do `PATH` pode ser um JDK 8,
que não roda o jar). Teste: `curl http://localhost:8080/api/status`.

**3. Subir o frontend** (porta 3000):

```bash
cd dbest-web
npm install
npm run dev
```

Abra <http://localhost:3000>. O frontend fala com a API em
`http://localhost:8080/api` (configurável por `NEXT_PUBLIC_API_URL`). A API só
aceita requisições de `localhost:3000` / `127.0.0.1:3000` (CORS).

## Testes

Os testes do frontend precisam da API no ar; o Playwright sobe o Next sozinho.

```bash
cd dbest-web
npx playwright test      # end-to-end (import, execução, pipeline, comparator)
npm test                 # unitário do serializador de query
npm run build            # build de produção (checa tipos)
```

Os testes end-to-end cobrem o ciclo real: importam uma tabela (CSV e BTree `.dat`),
montam operadores no canvas, executam e verificam o resultado.

## Organização do projeto

```
.
├── dbest-core/     motor original (desktop) — não modificar
├── dbest-api/      API Spring Boot
│   └── src/main/java/sgbd/dbest/api/
│       ├── controllers/   rotas REST (tabelas, execução, export, upload)
│       ├── service/        QueryBuilderService (JSON → árvore), TableService
│       └── dto/            objetos de requisição/resposta
├── dbest-web/      frontend Next.js
│   └── src/
│       ├── app/            página principal
│       ├── components/     canvas, modais, layout
│       ├── store/          estado global (Zustand)
│       ├── lib/            cliente HTTP e serializador
│       └── data/           catálogo de operadores da paleta
├── dados/          arquivos BTree de aula (.dat/.head) — não versionados
└── pom.xml         agregador Maven
```

## Limitações conhecidas

- **Paleta enxuta.** Só Filter, Projection, Sort e Limit estão disponíveis. Os
  modais e o roteamento de Join, União, Group By e Aggregation existem no código
  (e há wiring parcial no `QueryBuilderService`), mas esses operadores **não foram
  validados** e ficaram fora da paleta. Vale como base para continuação, não como
  funcionalidade entregue.
- **Agregação depende do core.** No `dbest-core`, `COUNT(*)` sem _group by_ retorna
  vazio e `AVG/SUM/MIN/MAX` só funcionam sobre colunas `INTEGER` (fazem cast fixo).
  Consertar isso exigiria alterar o código do professor, o que este trabalho não faz.
- **Sem isolamento por sessão.** O `TableService` usa o mapa estático global do core
  (`controllers.MainController`), então todos os navegadores compartilham as mesmas
  tabelas. Não é multiusuário.
- **`mvn test` trava.** A thread AWT/Swing não-daemon do core impede o JVM de teste
  de encerrar. Use sempre `-DskipTests`; para rodar testes de verdade seria preciso
  desacoplar o `TableService` do estado estático do core e rodar headless.
- **Windows / MAX_PATH.** Nomes de arquivo longos herdados do core estouram o limite
  de 260 caracteres em pastas profundas — use `core.longpaths true` ou um caminho curto.

## Continuação sugerida

Para as próximas turmas, em ordem aproximada de esforço/dependência:

1. **Operadores binários (join, união, diferença).** O `OperatorNode` já tem os
   _handles_ esquerdo/direito e o serializador grava `targetHandle`; falta validar
   cada tipo com duas tabelas e reexpô-los na paleta um a um.
2. **Group by + agregação sobre colunas `INTEGER`** (o caminho que o core executa
   corretamente), qualificando a coluna pela fonte como o desktop faz.
3. **Isolamento por sessão**, para virar multiusuário de verdade.
4. **Destravar o `mvn test`** (headless / desacoplar do estado estático) para
   reativar CI.
5. **Sincronizar o `dbest-core` com o upstream** do professor quando houver novidades.

