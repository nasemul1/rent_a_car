import request from 'supertest';
import app from '../../src/app';
import { setupTestDb } from '../helpers';

let cookie: string;

beforeAll(async () => {
  await setupTestDb();
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@rental.com', password: 'password123' });
  cookie = loginRes.headers['set-cookie'];
});

describe('Rental Endpoints', () => {
  it('should list rentals', async () => {
    const res = await request(app).get('/rentals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
  });

  it('should create rental', async () => {
    const vehicleRes = await request(app).get('/vehicles').set('Cookie', cookie);
    const vehicle = vehicleRes.body.data[0];
    const res = await request(app)
      .post('/rentals')
      .set('Cookie', cookie)
      .send({
        vehicle_id: vehicle.id,
        customer_name: 'Test Customer',
        customer_phone: '555-9999',
        start_date: '2026-10-01',
        end_date: '2026-10-05',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.total_amount).toBeDefined();
  });

  it('should return 409 for overlapping rental', async () => {
    const vehicleRes = await request(app).get('/vehicles').set('Cookie', cookie);
    const vehicle = vehicleRes.body.data[0];
    await request(app)
      .post('/rentals')
      .set('Cookie', cookie)
      .send({
        vehicle_id: vehicle.id,
        customer_name: 'First',
        customer_phone: '555-0001',
        start_date: '2026-11-01',
        end_date: '2026-11-05',
      });
    const res = await request(app)
      .post('/rentals')
      .set('Cookie', cookie)
      .send({
        vehicle_id: vehicle.id,
        customer_name: 'Second',
        customer_phone: '555-0002',
        start_date: '2026-11-03',
        end_date: '2026-11-07',
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already booked');
  });

  it('should get report for month', async () => {
    const res = await request(app)
      .get('/reports/rentals?month=2026-08')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.vehicles).toBeInstanceOf(Array);
  });
});
