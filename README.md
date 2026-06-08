# Aivacol Fleet API

API backend para gestão de frota, desenvolvida em NestJS.

O projeto cobre o fluxo principal de cadastro e consulta de modelos e veículos, com autenticação JWT, SQL Server via TypeORM, cache Redis nas consultas de veículos, migrations, seed inicial e testes automatizados.

## Stack

- Node.js 22
- NestJS 11
- TypeScript
- TypeORM
- SQL Server 2022
- Redis
- JWT com Passport
- Jest
- Docker Compose
- AWS SQS e DynamoDB para auditoria

## Estrutura

```text
src/
  audit/       auditoria resiliente em DynamoDB e SQS
  auth/        login, JWT strategy e guard global
  cache/       cliente Redis usado nas consultas de veículos
  common/      decorators, interfaces e utilitários compartilhados
  config/      leitura e validação de variáveis de ambiente
  database/    datasource TypeORM, migrations e seed
  models/      CRUD de modelos de veículos
  users/       usuário de autenticação seedado
  vehicles/    CRUD de veículos e regras de cache
```

Arquivos de apoio:

- `seed_vehicles.json`: mock usado pelo seed de veículos.
- `docker/sqlserver/init.sql`: cria banco, login e usuário da aplicação no SQL Server.
- `docker/sqlserver/init.sh`: aguarda o SQL Server ficar disponível e executa o bootstrap.

## Variáveis de ambiente

Crie o `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Preencha os valores sensíveis no `.env`. Esse arquivo não deve ser versionado.

Principais variáveis:

```env
PORT=3000

DB_HOST=sqlserver
DB_PORT=1433
DB_USERNAME=aivaroot
DB_PASSWORD=<senha-forte-do-sql-server>
DB_DATABASE=aivacol_fleet

REDIS_HOST=redis
REDIS_PORT=6379
VEHICLES_CACHE_TTL_SECONDS=60

JWT_SECRET=<segredo-forte-para-jwt>
JWT_EXPIRES_IN=1h

SEED_USERNAME=aivacol
SEED_USER_PASSWORD=<senha-forte-do-usuario-seed>
BCRYPT_SALT_ROUNDS=12

AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=<preencher-se-nao-usar-aws-configure>
AWS_SECRET_ACCESS_KEY=<preencher-se-nao-usar-aws-configure>
AWS_SQS_QUEUE_URL=<url-da-fila-sqs>
AWS_DYNAMODB_AUDIT_TABLE=audit-logs
```

Banco, Redis, JWT e senha do usuário seedado são obrigatórios. A aplicação falha na inicialização quando uma configuração essencial não foi informada.

Ao rodar tudo pelo Docker Compose, use `DB_HOST=sqlserver` e `REDIS_HOST=redis`. Se rodar a API localmente fora do container, apontando para os serviços expostos pelo Docker, use `DB_HOST=localhost` e `REDIS_HOST=localhost`.

## Subindo com Docker

```bash
docker compose up --build
```

O Compose sobe quatro serviços:

- `sqlserver`: banco SQL Server 2022.
- `sqlserver-init`: cria o banco `aivacol_fleet`, o login `aivaroot` e o usuário no banco.
- `redis`: cache usado nas consultas de veículos.
- `app`: roda migrations, seed e inicia a API.

A API fica disponível em:

```text
http://localhost:3000/api
```

Para parar:

```bash
docker compose down
```

Se for recriar banco do zero, remova também os volumes:

```bash
docker compose down -v
```

## Rodando localmente

Instale as dependências:

```bash
pnpm install
```

Suba SQL Server e Redis pelo Docker, ou use instâncias próprias. Com a infraestrutura disponível, rode:

```bash
pnpm migration:run
pnpm seed
pnpm start:dev
```

Atalho para preparar banco e dados iniciais:

```bash
pnpm db:setup
```

## Scripts

```bash
pnpm start:dev       # inicia em modo desenvolvimento
pnpm build           # compila o projeto
pnpm start:prod      # executa dist/main
pnpm migration:run   # aplica migrations
pnpm migration:revert # desfaz a última migration
pnpm seed            # cria usuário padrão e veículos do seed_vehicles.json
pnpm db:setup        # migration:run + seed
pnpm test            # roda testes Jest
pnpm test:cov        # gera cobertura
pnpm lint            # roda ESLint com fix
```

## Autenticação

Todas as rotas de negócio são protegidas por JWT. A única rota pública é o login.

Usuário criado pelo seed:

```text
usuário: valor de SEED_USERNAME
senha: valor de SEED_USER_PASSWORD
```

A senha é armazenada com hash bcrypt.

Login:

```http
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "username": "aivacol",
  "password": "<valor-de-SEED_USER_PASSWORD>"
}
```

Resposta:

```json
{
  "accessToken": "<jwt>"
}
```

Use o token nas demais rotas:

```http
Authorization: Bearer <jwt>
```

## Endpoints

### Models

```http
POST   /api/models
GET    /api/models
GET    /api/models/:id
PATCH  /api/models/:id
DELETE /api/models/:id
```

Criação:

```json
{
  "name": "Sprinter"
}
```

### Vehicles

```http
POST   /api/vehicles
GET    /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id
```

Criação:

```json
{
  "licensePlate": "ABC-1D23",
  "chassis": "9BWZZZ377VT004251",
  "renavam": "12345678901",
  "year": 2024,
  "modelId": "<uuid-do-modelo>"
}
```

As placas são normalizadas antes de salvar. Por exemplo, `abc-1d23` vira `ABC1D23`.

## Modelagem

Tabelas principais:

- `models`
- `vehicles`
- `users`

Campos obrigatórios de metadados nas entidades:

- `created_at`
- `updated_at`
- `created_by`

Relacionamento:

- um veículo pertence a um modelo;
- um modelo possui vários veículos.

O schema é criado por migration, com `synchronize: false`, para evitar alteração automática de banco em runtime.

## Cache Redis

O cache foi aplicado nas consultas de veículos:

- `GET /api/vehicles` usa a chave `vehicles:list`.
- `GET /api/vehicles/:id` usa a chave `vehicles:item:<id>`.

O tempo de expiração é configurado por:

```env
VEHICLES_CACHE_TTL_SECONDS=60
```

Invalidação automática:

- ao criar veículo;
- ao atualizar veículo;
- ao remover veículo.

Nessas operações o serviço remove as chaves `vehicles:*`, garantindo que a próxima consulta busque dados atualizados no banco.

## Auditoria com AWS

As mutações de `models` e `vehicles` geram eventos de auditoria.

Cada evento é enviado para:

- DynamoDB, usando a tabela definida em `AWS_DYNAMODB_AUDIT_TABLE`;
- SQS, usando a fila definida em `AWS_SQS_QUEUE_URL`.

Formato geral do evento:

```json
{
  "id": "uuid",
  "timestamp": "2026-06-08T00:00:00.000Z",
  "entity": "vehicle",
  "action": "created",
  "actor": "aivacol",
  "entityId": "uuid",
  "payload": {}
}
```

A auditoria é resiliente: se DynamoDB ou SQS falhar, o CRUD principal não é interrompido. A falha fica registrada no log da aplicação.

Ao rodar fora do Docker, o AWS SDK pode usar credenciais configuradas por `aws configure`. Dentro do Docker, informe as credenciais no `.env` ou use o mecanismo de credenciais do ambiente onde o container estiver rodando.

## Seed

O seed faz três coisas:

1. cria o usuário padrão definido por `SEED_USERNAME`;
2. cria os modelos encontrados em `seed_vehicles.json`;
3. cria os veículos do `seed_vehicles.json`.

O arquivo `seed_vehicles.json` fica na raiz do repositório para facilitar a avaliação e evitar dados fixos dentro do código.

## Testes

Rodar todos os testes:

```bash
pnpm test
```

Rodar com cobertura:

```bash
pnpm test:cov
```

O projeto possui testes cobrindo:

- autenticação e geração de JWT;
- rejeição de credenciais inválidas;
- regras de duplicidade em modelos;
- busca de modelo inexistente;
- cache hit e cache miss em listagem de veículos;
- cache hit e cache miss na consulta de veículo por id;
- veículo inexistente;
- criação de veículo com normalização de placa;
- invalidação de cache ao criar, atualizar e remover veículo;
- auditoria nas mutações de veículos;
- validações de DTO.

## Validação rápida antes de avaliar

```bash
pnpm build
pnpm test
pnpm lint
```

Com Docker:

```bash
docker compose up --build
```

Depois faça login em `POST /api/auth/login`, copie o token e use nas rotas de `models` e `vehicles`.

## Decisões de implementação

- Configuração sensível fica no `.env`, não no código.
- O `.env.example` serve como referência, sem segredos reais.
- JWT é aplicado por guard global. Rotas novas já nascem protegidas, exceto quando marcadas como públicas.
- Migrations definem o schema de forma explícita.
- Redis é usado diretamente no serviço de cache para manter o fluxo simples e visível.
- O seed lê `seed_vehicles.json`, evitando mock duplicado dentro do código.
- Erros de regra de negócio usam exceções do Nest, como `ConflictException` e `NotFoundException`.
- Auditoria AWS é desacoplada do CRUD para não comprometer o fluxo principal.
