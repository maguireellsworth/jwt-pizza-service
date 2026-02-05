// Mock Everything that needs mocking
jest.mock('../src/database/database', () => ({
    addUser: jest.fn(),
}));

jest.mock('../src/routes/authRouter', () => {
    const real = jest.requireActual('../src/routes/authRouter');
    return {
        ...real,
        setAuth: jest.fn(),
    };
});

// Then import mocked stuff
const request = require('supertest');
const DB = require('../src/database/database');
const { setAuth } = require('../src/routes/authRouter');
const app = require('../src/service');

// Global variables so its easier to set up tests
const mockUser = { name: 'name', email: 'email', password: 'password'};

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
    beforeAll(() => {
        DB.addUser.mockResolvedValue(mockUser);
        setAuth.mockResolvedValue('fake-jwt-token');
    })

    test('creates a new user', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send(mockUser);
        
    })

    test('returns 400 if rquired fields missing', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send({email: "email", password: "password"})
        
            expect(response.status).toBe(400);
            expect(DB.addUser).not.toHaveBeenCalled();
    })
})