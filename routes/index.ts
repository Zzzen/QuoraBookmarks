import express = require("express");
import db = require("../db");

const router = express.Router();

router.get("/", function (req, res, next) {
    db.getRandomUser().then(
        users => { res.render("index", { users }); },
        err => { res.status(500).send(err); }
    );
});

export = router;