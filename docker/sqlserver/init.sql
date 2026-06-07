DECLARE @databaseName sysname = N'__DB_DATABASE__';
DECLARE @loginName sysname = N'__DB_USERNAME__';
DECLARE @password nvarchar(256) = N'__DB_PASSWORD__';
DECLARE @sql nvarchar(max);

IF DB_ID(@databaseName) IS NULL
BEGIN
  SET @sql = N'CREATE DATABASE ' + QUOTENAME(@databaseName);
  EXEC(@sql);
END;

IF @loginName <> N'sa'
  AND NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = @loginName)
BEGIN
  SET @sql = N'CREATE LOGIN ' + QUOTENAME(@loginName)
    + N' WITH PASSWORD = N''' + REPLACE(@password, '''', '''''') + N''', CHECK_POLICY = ON';
  EXEC(@sql);
END;

SET @sql = N'
USE ' + QUOTENAME(@databaseName) + N';

IF N''' + REPLACE(@loginName, '''', '''''') + N''' <> N''sa''
  AND NOT EXISTS (
    SELECT 1 FROM sys.database_principals
    WHERE name = N''' + REPLACE(@loginName, '''', '''''') + N'''
  )
BEGIN
  CREATE USER ' + QUOTENAME(@loginName) + N' FOR LOGIN ' + QUOTENAME(@loginName) + N';
END;

IF N''' + REPLACE(@loginName, '''', '''''') + N''' <> N''sa''
BEGIN
  ALTER ROLE db_owner ADD MEMBER ' + QUOTENAME(@loginName) + N';
END;';

EXEC(@sql);
