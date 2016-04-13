/*jshint esversion: 6 */

const DIR = __dirname + "/public/javascripts/";

module.exports = {
    entry: {
        index: DIR + "index.js",
        bookmark: DIR + "bookmark.js"
    },
    output: {
        path: DIR,
        filename: "[name]Bundled.js"
    }
};