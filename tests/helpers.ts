import knex from 'knex';
import knexConfig from '../knexfile';

process.env.NODE_ENV = 'test';

const testDb = knex({
  ...knexConfig.test,
  pool: { min: 0, max: 5 },
});

let seeded = false;

export async function setupTestDb() {
  await testDb.migrate.latest();
  if (!seeded) {
    await testDb.seed.run();
    seeded = true;
  }
}

export async function teardownTestDb() {
  await testDb.destroy();
}

export { testDb };
