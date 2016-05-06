import express = require("express");
import db = require("../db");

const router = express.Router();


router.post("/", async (req, res) => {
    const comment = {
        ip: req.ip,
        content: req.body.content
    };

    if (comment.content) {

        try {
            await db.addComment;
            res.send({});
        } catch (err) {
            console.log(err);
            res.status(400).send({ err });
        }

    } else {
        res.status(409).send({ err: "empty content" });
    }
});

router.get("/", async (req, res) => {
    const start = Number.parseInt(req.query.start) || 0;
    const length = Number.parseInt(req.query.length) || 10;

    try {
        const results = await db.getComments();
        res.send(results);
    } catch (err) {
        res.status(400).send({ err });
    }
});


export = router;