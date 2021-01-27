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

function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'https://www.malicious.com',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 1,
    };

    const expectedBookmark = {
        ...maliciousBookmark,
        title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    };

    return {
        maliciousBookmark,
        expectedBookmark
    };
}

module.exports = {
    makeBookmarksArray,
    makeMaliciousBookmark
}