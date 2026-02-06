// Then import mocked stuff
const request = require('supertest');
const app = require('../src/service');
const { resetDb } = require('./helpers/resetDB')
const { Role, DB } = require('../src/database/database.js');

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

describe('franchise router', () => {
    let token;
    let admin_u;
    let franchiseid;
    beforeAll(async () => {
        await resetDb();
        admin_u = await createAdminUser();

        const login = await request(app)
            .put('/api/auth')
            .send({email: admin_u.email, password: admin_u.password});
        
        expect(login.status).toBe(200);
        expectValidJwt(login.body.token);
        token = login.body.token;
    })

    test('creates a franchise', async () => {
        const response = await request(app)
            .post('/api/franchise')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'testFranchise',
                admins: [{email: admin_u.email}]
            });

        if(response.status != 200){
            console.log(response.body);
        }
        expect(response.status).toBe(200);
    })

    test('gets user franchises', async () => {
        const response = await request(app)
            .get(`/api/franchise/${admin_u.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send()


        if(response.status != 200){
            console.log(response.body);
        }
        expect(response.status).toBe(200);
        const franchise = response.body[0];
        expect(franchise).toHaveProperty('id');
        franchiseid = franchise.id;
        expect(franchise).toHaveProperty('name', 'testFranchise');
        expect(franchise).toHaveProperty('admins');
        expect(franchise).toHaveProperty('stores');
    });

    test('deletes a franchise', async () => {
        const response = await request(app)
            .delete('/api/franchise/1')
            .set('Authorization', `Bearer ${token}`)
            .send();

        if(response.status != 200){
            console.log(response.body)
        }
        expect(response.status).toBe(200);
        expect(response.body).toEqual({message: 'franchise deleted'})
    })

    test('creates a new store under a franchise', async () => {
        const createFran = await request(app)
            .post('/api/franchise')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'storeFranchise',
                admins: [{email: admin_u.email}]
            });
        expect(createFran.status).toBe(200);
        const franid = createFran.body.id;

        const createStore = await request(app)
            .post(`/api/franchise/${franid}/store`)
            .set('Authorization', `Bearer ${token}`)
            .send({name: 'testStore'})

        if(createStore.status != 200){
            console.log(createStore.body);
        }
        expect(createStore.status).toBe(200);
        expect(createStore.body).toHaveProperty('id');
        expect(createStore.body).toHaveProperty('franchiseId');
        expect(createStore.body).toHaveProperty('name');
    })

    // test('deletes an existing store from an existing franchise', async () => {
    //     const response
    // })
})

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

function randomName() {
    return Math.random().toString(36).substring(2, 12)
}