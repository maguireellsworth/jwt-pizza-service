// Then import mocked stuff
const request = require('supertest');
const app = require('../src/service');
const { resetDb } = require('./helpers/resetDB')

// Global variables so its easier to set up tests
const mockUser = { name: 'name', email: 'email@email', password: 'password'};
describe('base routes', () => {
    test('get docs', async () => {
        const docsRes = await request(app).get('/api/docs');
        expect(docsRes.status).toBe(200);
        expect(docsRes.body).toHaveProperty('version');
        expect(docsRes.body).toHaveProperty('endpoints');
        expect(docsRes.body).toHaveProperty('config');
        expect(typeof docsRes.body.version).toBe('string');
    })

    test('get home page', async () => {
        const docsRes = await request(app).get('/');
        expect(docsRes.body).toHaveProperty('message');
        expect(docsRes.body).toHaveProperty('version');
    })

    test('return 404 on unknown path', async () => {
        const docsRes = await request(app).get('/wrongpath');
        expect(docsRes.status).toBe(404);
    })
});

// Auth Router test
describe('auth router', () => {
    let token;
    beforeAll(async () => {
        await resetDb();
    })

    test('registers a new user', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send({name: 'Alice', email: 'alice@test.com', password: "password"});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', 'alice@test.com');
        expect(response.body).toHaveProperty('token');
        expectValidJwt(response.body.token);
    });

    test('logins in an existing user', async () => {
        const response = await request(app)
            .put('/api/auth')
            .send({email: 'alice@test.com', password: 'password'});
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expectValidJwt(response.body.token)
        token = response.body.token;
    })

    test('logs out a logged in user', async () => {
        expect(token).toBeTruthy();
        const response = await request(app)
            .delete('/api/auth')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({message: 'logout successful'})
    })
})

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}