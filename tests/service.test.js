// Mock Everything that needs mocking
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'fake-jwt-token'),
    verify: jest.fn(),
}))

jest.mock('../src/database/database', () => ({
    Role: { Diner: 'diner'},
    DB: {
        addUser: jest.fn(),
        loginUser: jest.fn(),
        getUser: jest.fn(),
        logoutUser: jest.fn(),
        isLoggedIn: jest.fn(),
    }
}));


// Then import mocked stuff
const request = require('supertest');
const { DB } = require('../src/database/database');
const app = require('../src/service');

// Global variables so its easier to set up tests
const mockUser = { name: 'name', email: 'email@email', password: 'password123'};

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
    beforeEach(() => {
        jest.clearAllMocks();

        DB.addUser.mockResolvedValue({
            id: 1,
            name: 'name',
            email: 'email@email',
            roles: [{role: 'diner'}],
        });
        
        DB.loginUser.mockResolvedValue();
    })

    test('creates a new user', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send(mockUser);

        if(response.status != 200){
            console.log(response.status, response.body);
        }
        expect(response.status).toBe(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token', 'fake-jwt-token');
        expect(response.body.user).toHaveProperty('email', 'email@email')
        
    })

    test('returns 400 if rquired fields missing', async () => {
        const response = await request(app)
            .post('/api/auth')
            .send({email: "email", password: "password"})
        
            expect(response.status).toBe(400);
            expect(DB.addUser).not.toHaveBeenCalled();
    })
})