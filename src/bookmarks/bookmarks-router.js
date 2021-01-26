const express = require('express');
const { isWebUri } = require('valid-url');
const { v4: uuid } = require('uuid');
const logger = require('../logger');
const { bookmarks } = require('../store');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description,
    rating: Number(bookmark.rating)
});

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(bookmarks => {
                res.json(bookmarks.map(bookmark => serializeBookmark(bookmark)));
            })
            .catch(next);
    })
    .post(bodyParser, (req, res) => {
        const { title, url, description, rating } = req.body;

        if (!title) {
            logger.error(`Title is required`);
            return res
                .status(400)
                .send('Invalid data');
        }
    
        if (!url) {
            logger.error(`Url is required`);
            return res
                .status(400)
                .send('Invalid data');
        }
    
        if (!rating) {
            logger.error(`Rating is required`);
            return res
                .status(400)
                .send('Invalid data');
        }
    
        if (!isWebUri(url)) {
            logger.error(`Invalid url`);
            return res
                .status(400)
                .send('Invalid data');
        }
    
        if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating. Rating must be a number between 0 and 5`);
            return res
                .status(400)
                .send('Invalid data');
        }
    
        const id = uuid();
    
        const bookmark = {
            id,
            title,
            url,
            description,
            rating
        };
    
        bookmarks.push(bookmark);
    
        logger.info(`Bookmark created with id ${id}`);
    
        res
            .status(201)
            .location(`http://localhost:8000/bookmark/${id}`)
            .json(bookmark);
    });

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res, next) => {
        const { id } = req.params;

        BookmarksService.getById(req.app.get('db'), id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${id} not found.`);
                    return res
                        .status(404)
                        .json({
                            error: { message: 'Not found'}
                        });
                }
                res.json(serializeBookmark(bookmark));
            })
            .catch(next);
    })
    .delete((req, res) => {
        const { id } = req.params;

        const bookmarkIndex = bookmarks.find(bm => bm.id == id);
    
        if (bookmarkIndex === -1) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res
                .status(404)
                .send('Not found');
        }
    
        bookmarks.splice(bookmarkIndex, 1);
    
        logger.info(`Bookmark with id ${id} deleted.`);
        
        res
            .status(204)
            .end();
    })

module.exports = bookmarksRouter;