Como criar migrations:

1. Crie um arquivo SQL nomeado com prefixo incremental, por exemplo `001_create_api_configs_table.sql`.
2. Coloque o SQL DDL/DML necessário dentro do arquivo.
3. Execute a migration com, no diretório `api/`:

```bash
npm run migrate:pg
```

O script registra as migrations aplicadas na tabela `schema_migrations`.

Boas práticas:
- Evite operações destrutivas sem revisão (DROP TABLE). Use migrations de rollback separadas.
- Teste a migration em um ambiente de staging antes de aplicar em produção.
