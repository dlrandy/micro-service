const seneca = require('seneca');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const service = seneca();

service.add('role:upload,image:*,data:*', function (msg, next) {
  let filename = path.join(__dirname, 'uploads', msg.image);
  let data = Buffer.from(msg.data, 'base64');
  fs.writeFile(filename, data, err => {
    if (err) {
      return next(err);
    }
    return next(null, {size: data.length});
  })
})

service.add('role:check,image:*', function (msg, next) {
  let filename = path.join(__dirname, 'uploads', msg.image);
  fs.access(filename, fs.constants.R_OK, err => {
    return next(null, {exists:!err});
  })
  
})

service.add('role:download,image:*', (msg, next) => {
  let filename = path.join(__dirname, 'uploads', msg.image);
  fs.access(filename, fs.constants.R_OK, err => {
    if (err) {
      return next(err);
    }
    let {
      width,
      height,
      blur,
      sharpen,
      greyscale,
      flip,
      flop
    } = msg;

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
      image.blur()
    }
    sharpen = +sharpen;
    if (sharpen) {
      image.sharpen(sharpen);
    }
    if (!!greyscale) {
      image.greyscale();
    }

    image.toBuffer().then(data => {
      return next(null, {data: data.toString('base64')});
    })
  })
})

service.listen(3000)












