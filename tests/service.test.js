// Then import mocked stuff
const request = require('supertest');
const app = require('../src/service');

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
        // TODO: reset the database;
    })

    test('registers a new user', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send({name: 'Alice', email: 'alice@test.com', password: "password"});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', 'alice@test.com');
        expect(response.body).toHaveProperty('token');
    });

    test('logins in an existing user', async () => {
        const response = await request(app)
            .put('/api/auth')
            .send({email: 'alice@test.com', password: 'password'});
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        token = response.body.token;
    })

    test('logs out a logged in user', async () => {
        const response = await request(app)
            .delete('/api/auth')
            .set('Authorization', 'Bearer ${token}')

        expect(response.status).toBe(200);
        expect(logout.body).toEqual({message: 'logout successful'})
    })
})

// describe('franchise router', () => {
 
// })