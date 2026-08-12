import request from 'supertest';
import app from '../../src/app';
import { setupTestDb } from '../helpers';

beforeAll(async () => {
  await setupTestDb();
});

describe('Auth Endpoints', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@rental.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged in');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@rental.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('should logout and clear cookies', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@rental.com', password: 'password123' });
    const cookie = loginRes.headers['set-cookie'];
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
});
