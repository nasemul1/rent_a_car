import knex from 'knex';
import knexConfig from '../knexfile';

process.env.NODE_ENV = 'test';

const testDb = knex(knexConfig.test);

export async function setupTestDb() {
  await testDb.migrate.latest();
  await testDb.seed.run();
}

export async function teardownTestDb() {
  await testDb.destroy();
}

export { testDb };
