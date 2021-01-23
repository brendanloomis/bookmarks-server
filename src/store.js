const { v4: uuid } = require('uuid');
const bookmarksRouter = require('./bookmarks/bookmarks-router');

const bookmarks = [
    {
        id: uuid(),
        title: 'Google',
        url: 'https://www.google.com',
        description: 'Search Engine',
        rating: 5
    },
    {
        id: uuid(),
        title: 'Twitter',
        url: 'https://www.Twitter.com',
        description: 'Social media',
        rating: 4
    }
];

module.exports = { bookmarks };