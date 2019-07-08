/**
 * @name imagini-v1-api
 * @description This module packages the Imagini API.
 */
"use strict";
const enables = ["y", "yes", "on", "true", "1"];
const hydraExpress = require("hydra-express");
const hydra = hydraExpress.getHydra();
const express = hydraExpress.getExpress();
const ServerResponse = require("fwsp-server-response");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const bodyparser = require("body-parser");

let serverResponse = new ServerResponse();
express.response.sendError = function(err) {
  serverResponse.sendServerError(this, { result: { error: err } });
};
express.response.sendOk = function(result) {
  serverResponse.sendOk(this, { result });
};

let api = express.Router();

api.param("image", (req, res, next, image) => {
  if (!image.match(/\.(png|jpg)$/i)) {
    return res.sendError("invalid imaghe type/extension");
  }

  req.image = image;
  req.localpath = path.join(__dirname, "../uploads", req.image);
  return next();
});

api.get("/", (req, res) => {
  res.sendOk({ greeting: "Welcome to Hydra Express!" });
});

api.post(
  "/:image",
  bodyparser.raw({
    limit: "10mb",
    type: "image/*"
  }),
  (req, res) => {
    let fd = fs.createWriteStream(req.localpath, {
      flags: "w+",
      encoding: "binary"
    });
    fd.end(req.body);

    fd.on("close", () => {
      res.sendOk({ size: req.body.length });
    });
  }
);

api.head("/:image", (req, res) => {
  fs.access(req.localpath, fs.constants.R_OK, err => {
    if (err) {
      return res.sendError("image not found");
    }

    return res.sendOk();
  });
});
api.get("/:image", (req, res) => {
  fs.access(req.localpath, fs.constants.R_OK, err => {
    if (err) {
      return res.sendError("image not found");
    }
    let {
      width,
      height,
      blur = 0,
      sharpen = 0,
      greyscale,
      flip,
      flop
    } = req.query;
    blur = +blur;
    sharpen = +sharpen;
    greyscale = enables.includes(greyscale);
    flip = enables.includes(flip);
    flop = enables.includes(flop);
    let image = sharp(req.localpath)
    .resize(width ? +width : undefined,
      height ? +height : undefined, {
      fit: sharp.fit.inside,
      withoutEnlargement: false
    });
    if (flip) {
      image.flip();
    }
    if (flop) {
      image.flop();
    }
    if (blur && +blur > 0) {
      image.blur();
    }
    if (sharpen && +sharpen > 0) {
      image.sharpen(sharpen);
    }
    if (greyscale) {
      image.greyscale();
    }
    const format = path.extname(req.image).substr(1) == 'png' ? 'png' : 'jpeg';
    res.setHeader(
      "Content-Type",
      "image/" + format
    );
    image.pipe(res);
  });
});
module.exports = api;
