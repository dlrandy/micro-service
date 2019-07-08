const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const express = require("express");
const sharp = require("sharp");
const app = express();

app.param("image", (req, res, next, image) => {
  if (!image.match(/\.(png|jpg)$/i)) {
    return res.status(req.method === "POST" ? 403 : 404).end();
  }
  req.image = image;
  req.localpath = path.join(__dirname, "/..", "uploads", image);

  return next();
});

app.post(
  "/uploads/:image",
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
      res.send({
        status: "ok",
        size: req.body.listen
      });
    });
  }
);

app.head("/uploads/:image", (req, res) => {
  fs.access(req.localpath, fs.constants.R_OK, err => {
    res.status(err ? 404 : 200).end();
  });
});
const switchs = ["y", "yes", "true", "1", "on"];
app.get("/uploads/:image", (req, res) => {
  console.log(req.localpath);
  fs.access(req.localpath, fs.constants.R_OK, err => {
    if (err) {
      return res.status(404).end();
    }

    let { width, height, blur, sharpen, greyscale, flip, flop } = req.query;

    let image = sharp(req.localpath).resize(
      width ? +width : undefined,
      height ? +height : undefined,
      {
        fit: sharp.fit.inside,
        withoutEnlargement: false
      }
    );
    if (switchs.includes(flip)) {
      image.flip();
    }
    if (switchs.includes(flop)) {
      image.flop();
    }
    if (blur && +blur > 0) {
      image.blur();
    }
    if (sharpen && +sharpen > 0) {
      image.sharpen(sharpen);
    }
    if (switchs.includes(greyscale)) {
      image.greyscale();
    }

    image.pipe(res);

    // const format = path.extname(req.image).substr(1) == 'png' ? 'png' : 'jpeg';
    // res.setHeader(
    //   "Content-Type",
    //   "image/" + format
    // );
    // image.pipe(res);
  
  });
});

app.listen(3000, () => {
  console.log("ready");
});
