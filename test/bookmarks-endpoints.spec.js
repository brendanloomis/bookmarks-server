const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');
const store = require('../src/store');

describe('Bookmarks Endpoints', () => {
    let db;
    
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('cleanup', () => db('bookmarks').truncate());

    afterEach('cleanup', () => db('bookmarks').truncate());

    describe(`Unauthorized requests`, () => {
        it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
            return supertest(app)
                .get('/bookmarks')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
            const secondBookmark = store.bookmarks[1];
            return supertest(app)
                .get(`/bookmarks/${secondBookmark.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });
    });

    describe('GET /bookmarks', () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, []);
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            });
        });
    });

    describe('GET /bookmarks/:id', () => {
        context(`Given no bookmarks`, () => {
            it(`responds 404 when bookmark doesn't exist`, () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: 'Not found' }
                    });
            });
        });

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();
            
            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            });
        });
    });
});