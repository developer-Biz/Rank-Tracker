const request = require('supertest');
const app = require('../server');

describe('API Security Tests', () => {
    it('should reject unauthenticated requests mapped to /api/rank/health', async () => {
        const res = await request(app).get('/api/rank/health');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toMatch(/Unauthorized/i);
    });

    it('should reject requests with invalid tokens', async () => {
        const res = await request(app)
            .get('/api/rank/health')
            .set('Authorization', 'Bearer invalid_fake_token_123');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toMatch(/Unauthorized/i);
    });

    it('should block unauthenticated requests to /api/rank/check', async () => {
        const res = await request(app)
            .post('/api/rank/check')
            .send({ domain: 'example.com', keywords: ['test'] });
        expect(res.statusCode).toBe(401);
    });
});
