import express = require("express");
import db = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
    const {login} = req.query;

    try {
        const userId = await db.getUserByCookie(login);
        
    } catch (err) {
        res.status(400).send({ err });
    }
});

export = router;