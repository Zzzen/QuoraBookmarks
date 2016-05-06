import express = require("express");
import db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("index");
});

export = router;