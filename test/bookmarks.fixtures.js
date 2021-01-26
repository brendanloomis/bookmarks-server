function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'Google',
            url: 'https://www.google.com',
            description: 'Search Engine',
            rating: 5
        },
        {
            id: 2,
            title: 'Twitter',
            url: 'https://www.twitter.com',
            description: 'Social Media',
            rating: 4
        },
        {
            id: 3,
            title: 'Youtube',
            url: 'https://www.youtube.com',
            description: 'A place to watch videos',
            rating: 5
        }
    ];
};

module.exports = {
    makeBookmarksArray
}