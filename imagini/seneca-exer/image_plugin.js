
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

module.exports = function(settings = { path: "uploadss" }) {
  const localpath = image => {
    return path.join(settings.path, image);
  };
  const access = (filename, next) => {
    fs.access(filename, fs.constants.R_OK, err => {
      return next(!err, filename);
    });
  };
  this.add("role:check,image:*", (msg, next) => {
    access(localpath(msg.image), exists => {
      return next(null, { exists });
    });
  });
  this.add("role:upload,image:*,data:*", (msg, next) => {
    let data = Buffer.from(msg.data, "base64");
    fs.writeFile(localpath(msg.image), data, err => {
      return next(err, { size: data.length });
    });
  });
  this.add("role:download,image:*", (msg, next) => {
    let data = Buffer.from(msg.data, "base64");
    fs.writeFile(localpath(msg.image), data, err => {
      return next(err, { size: data.length });
    });
  });

  this.add("role:download,image:*", (msg, next) => {
    access(localpath(msg.image), (exists, filename) => {
      if (!exists) {
        return next(new Error("image not found"));
      }

      let { width, height, blur, sharpen, greyscale, flip, flop } = msg;

      let image = sharp(filename).resize(+width || null, +height || null, {
        fit: sharp.fit.inside,
        withoutEnlargement: false
      });
      if (!!flip) {
        image.flip();
      }
      if (!!flop) {
        image.flop();
      }
      blur = +blur;
      if (blur > 0) {
        image.blur();
      }
      sharpen = +sharpen;
      if (sharpen) {
        image.sharpen(sharpen);
      }
      if (!!greyscale) {
        image.greyscale();
      }

      image.toBuffer().then(data => {
        return next(null, { data: data.toString("base64") });
      });
    });
  });
};
