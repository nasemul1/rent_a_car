import request from 'supertest';
import app from '../../src/app';
import { setupTestDb, teardownTestDb } from '../helpers';

let cookie: string;

beforeAll(async () => {
  await setupTestDb();
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@rental.com', password: 'password123' });
  cookie = loginRes.headers['set-cookie'];
});

afterAll(async () => {
  await teardownTestDb();
});

describe('Vehicle Endpoints', () => {
  it('should list vehicles with pagination', async () => {
    const res = await request(app).get('/vehicles').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('should filter by category', async () => {
    const res = await request(app)
      .get('/vehicles?category=Sedan')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    res.body.data.forEach((v: any) => expect(v.category).toBe('Sedan'));
  });

  it('should get vehicle by id', async () => {
    const listRes = await request(app).get('/vehicles').set('Cookie', cookie);
    const firstId = listRes.body.data[0].id;
    const res = await request(app)
      .get(`/vehicles/${firstId}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(firstId);
  });

  it('should return 404 for non-existent vehicle', async () => {
    const res = await request(app).get('/vehicles/9999').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('should create vehicle', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Cookie', cookie)
      .field('name', 'Test Car')
      .field('plate_number', 'TEST-0001')
      .field('category', 'Sedan')
      .field('daily_rate', '55.00');
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Car');
  });

  it('should soft delete vehicle', async () => {
    const createRes = await request(app)
      .post('/vehicles')
      .set('Cookie', cookie)
      .field('name', 'Delete Me')
      .field('plate_number', 'DEL-0001')
      .field('category', 'Sedan')
      .field('daily_rate', '40.00');
    const id = createRes.body.data.id;
    const res = await request(app)
      .delete(`/vehicles/${id}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    const getRes = await request(app)
      .get(`/vehicles/${id}`)
      .set('Cookie', cookie);
    expect(getRes.status).toBe(404);
  });
});
