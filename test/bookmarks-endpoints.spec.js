const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures');

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
        const testBookmarks = makeBookmarksArray();

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks);
        });

        it(`responds with 401 Unauthorized for GET /api/bookmarks`, () => {
            return supertest(app)
                .get('/api/bookmarks')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for POST /api/bookmarks`, () => {
            return supertest(app)
                .post('/api/bookmarks')
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for GET /api/bookmarks/:id`, () => {
            const secondBookmark = testBookmarks[1];
            return supertest(app)
                .get(`/api/bookmarks/${secondBookmark.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:id`, () => {
            const bookmark = testBookmarks[1];
            return supertest(app)
                .delete(`/api/bookmarks/${bookmark.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });

        it(`responds with 401 Unauthorized for PATCH /api/bookmarks/:id`, () => {
            const bookmark = testBookmarks[1];
            return supertest(app)
                .patch(`/api/bookmarks/${bookmark.id}`)
                .expect(401, { error: 'Unauthorized request' });
        });
    });

    describe('GET /api/bookmarks', () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/bookmarks')
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
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks);
            });
        });

        context('Given an XSS attack bookmark', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark]);
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title);
                        expect(res.body[0].description).to.eql(expectedBookmark.description);
                    });
            });
        });
    });

    describe('GET /api/bookmarks/:id', () => {
        context(`Given no bookmarks`, () => {
            it(`responds 404 when bookmark doesn't exist`, () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
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
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            });
        });

        context(`Given an XSS attack bookmark`, () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([maliciousBookmark])
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title);
                        expect(res.body.description).to.eql(expectedBookmark.description);
                    });
            });
        });
    });

    describe('DELETE /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it(`responds 404 when bookmark doesn't exist`, () => {
                return supertest(app)
                    .delete(`/api/bookmarks/123456`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {
                        error: { message: 'Not found' }
                    });
            });
        });

        context('Given there are bookmarks', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 204 and removes the bookmark', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bm => bm.id !== idToRemove);
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks);
                    });
            });
        });
    });

    describe('POST /api/bookmarks', () => {
        const requiredFields = ['title', 'url', 'rating'];

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test new bookmark',
                url: 'https://www.test.com',
                rating: 1
            };

            it(`responds with 400 and an error message when the ${field} is missing`, () => {
                delete newBookmark[field];

                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: 'Invalid data' }
                    });
            });
        });

        it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
            const newBookmark = {
                title: 'test title',
                url: 'https://www.test.com',
                rating: 7
            };

            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: 'Invalid data' }
                });
        });

        it(`responds with 400 invalid 'url' if not a valid URL`, () => {
            const newBookmark = {
                title: 'test title',
                url: 'htp:/sddtes',
                rating: 1
            };

            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: { message: 'Invalid data' }
                });
        });

        it(`creats a bookmark, responding with 201 and the new bookmark`, () => {
            const newBookmark = {
                title: 'test title',
                url: 'http://www.test.com',
                description: 'test description',
                rating: 1
            };

            return supertest(app)
                .post('/api/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.description).to.eql(newBookmark.description);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
                })
                .then(res => {
                    supertest(app)
                        .get(`/api/bookmarks/${res.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(res.body);
                });
        });

        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

            return supertest(app)
                .post('/api/bookmarks')
                .send(maliciousBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title);
                    expect(res.body.description).to.eql(expectedBookmark.description);
                });
        });
    });

    describe(`PATCH /api/bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Not found' } });
            });
        });

        context(`Given there are bookmarks in the database`, () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it(`responds with 204 and updates the bookmark`, () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated title',
                    url: 'https://updated.com',
                    description: 'updated description',
                    rating: 2
                };
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    );
            });

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
                        }
                    });
            });

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated title'
                };
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    );
            });

            it(`responds with 400 invalid 'rating' if not between 0 amd 5`, () => {
                const idToUpdate = 2;
                const updateInvalidRating = {
                    rating: 7
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateInvalidRating)
                    .expect(400, {
                        error: {
                            message: 'Invalid data'
                        }
                    });
            });

            it(`responds with 400 invalid 'url' if not a valid url`, () => {
                const idToUpdate = 2;
                const updateInvalidUrl = {
                    url: 'htp:/sf/ss'
                };

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateInvalidUrl)
                    .expect(400, {
                        error: {
                            message: 'Invalid data'
                        }
                    });
            });
        });
    });
});