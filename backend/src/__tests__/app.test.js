const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/items', () => {
  it('should return a list of items', async () => {
    const res = await request(app).get('/api/items');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  it('should return items with id and name', async () => {
    const res = await request(app).get('/api/items');
    res.body.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
    });
  });
});
