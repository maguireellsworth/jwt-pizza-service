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
const jwt = require('jsonwebtoken');

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
    beforeEach(() => {
        jest.clearAllMocks();

        DB.addUser.mockResolvedValue({
            id: 1,
            name: 'name',
            email: 'email@email',
            roles: [{role: 'diner'}],
        });

        DB.getUser.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@email.com',
        roles: [{ role: 'diner' }],
        password: undefined,
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

    test('logs in a user', async () => {
        const response = await request(app)
            .put('/api/auth')
            .send({email: 'email@email', password: 'password'});

        // console.log(response.body)

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token', 'fake-jwt-token')
    })

    test('logs out user', async () => {
        DB.isLoggedIn.mockResolvedValue(true);
        jwt.verify.mockReturnValue({
        id: 1,
        email: 'email@email',
        roles: [{ role: 'diner' }],
        });

        DB.logoutUser.mockResolvedValue();

        const res = await request(app)
        .delete('/api/auth')
        .set('Authorization', 'Bearer abc.def.ghi');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'logout successful');

        // clearAuth() uses readAuthToken -> extracts the token -> calls DB.logoutUser(token)
        expect(DB.logoutUser).toHaveBeenCalledTimes(1);
        expect(DB.logoutUser).toHaveBeenCalledWith('abc.def.ghi');
  });
})

describe('franchise router', () => {
    test('')
})