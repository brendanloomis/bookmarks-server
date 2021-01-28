const express = require('express');
const path = require('path');
const { isWebUri } = require('valid-url');
const xss = require('xss');
const logger = require('../logger');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: Number(bookmark.rating)
});

bookmarksRouter
    .route('/')
    .get((req, res, next) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark));
            })
            .catch(next);
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const newBookmark = { title, url, description, rating };

        for (const [key, value] of Object.entries(newBookmark)) {
            if (value == null) {
                logger.error(`${key} is required`)
                return res.status(400).send({
                    error: { message: 'Invalid data' }
                });
            }
        }

        const ratingNum = Number(rating);
    
        if (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
            logger.error(`Invalid rating. Rating must be a number between 0 and 5`);
            return res
                .status(400)
                .send({
                    error: { message: 'Invalid data' }
                });
        }

        if (!isWebUri(url)) {
            logger.error(`Invalid url`);
            return res.status(400).send({
                error: { message: 'Invalid data' }
            });
        }

        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                logger.info(`Bookmark with id ${bookmark.id} created.`);
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(serializeBookmark(bookmark));
            })
            .catch(next);
    });

bookmarksRouter
    .route('/:id')
    .all((req, res, next) => {
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
                res.bookmark = bookmark;
                next();
            })
            .catch(next);
    })
    .get((req, res) => {
        res.json(serializeBookmark(res.bookmark));
    })
    .delete((req, res, next) => {
        const { id } = req.params;
        BookmarksService.deleteBookmark(
            req.app.get('db'),
            id
        )
            .then(() => {
                logger.info(`Bookmark with id ${id} deleted.`);
                res.status(204).end()
            })
            .catch(next);
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const bookmarkToUpdate = { title, url, description, rating };

        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            logger.error(`Invalid update without required fields`)
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
                }
            });
        }

        const ratingNum = Number(rating);
    
        if (rating && (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5)) {
            logger.error(`Invalid rating. Rating must be a number between 0 and 5`);
            return res
                .status(400)
                .send({
                    error: { message: 'Invalid data' }
                });
        }

        if (url && !isWebUri(url)) {
            logger.error(`Invalid url`);
            return res.status(400).send({
                error: { message: 'Invalid data' }
            });
        }

        BookmarksService.updateBookmark(
            req.app.get('db'),
            req.params.id,
            bookmarkToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end();
            })
            .catch(next);
    });

module.exports = bookmarksRouter;