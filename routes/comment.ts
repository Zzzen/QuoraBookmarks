import express = require("express");
import db = require("../db");

const router = express.Router();


router.post("/", (req, res) => {
    const comment = {
        ip: req.ip,
        content: req.body.content
    };

    if (comment.content) {
        db.addComment(comment).then(
            () => { res.send({}); },
            err => { res.status(400).send({ err }); }
        );
    } else {
        res.status(409).send({ err: "empty content" });
    }
});

router.get("/", (req, res) => {
    const start = Number.parseInt(req.query.start) || 0;
    const length = Number.parseInt(req.query.length) || 10;

    db.getComments(start, length).then(
        results => { res.send(results); },
        err => { res.status(400).send({ err }); }
    );
});


export = router;