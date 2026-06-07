import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  await dataSource.initialize();
  await dataSource.runMigrations();
}

runMigrations()
  .then(async () => {
    await dataSource.destroy();
    process.stdout.write('Migrations completed.\n');
  })
  .catch(async (error: unknown) => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
