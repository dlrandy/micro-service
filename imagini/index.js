const express = require('express');
const sharp = require('sharp');
const bodyparser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();


app.param('image', (req, res, next, image) => {
	if (!image.match(/\.(png|jpg)$/i)) {
		return res.status(req.method === 'POST' ? 403 : 404).end();
	}
	req.image = image;
	req.localpath  = path.join(__dirname, 'uploads', req.image);
	return next();
})

app.param('greyscale', (req, res, next, greyscale)=>{
	if (greyscale !== 'bw') {
		return next('route');
	}
	req.greyscale = true
	return next();
})

app.param('width', (req, res,next, width ) => {
	req.width = +width;
	return next();
})
app.param('height', (req, res, next, height) => {
	req.height = +height;
	return next();
})

app.get(/\/thumbnail\.(jpg|png)/, (req, res, next) => {
  let format = req.params[0] == 'png' ? 'png' : 'jpeg';
  let width = +req.query.width || 300,
  height = +req.query.height || 200,
  border = +req.query.border || 5,
  bgcolor = req.query.bgcolor || '#fcfcfc',
  fgcolor = req.query.fgcolor || '#ddd',
  textcolor = req.query.textcolor || '#aaa',
  textsize = +req.query.textsize || 24,
  image = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.5 }
    }
  });

  const thumnail = Buffer.from(`<svg width="${width}" height="${height}">
	<rect
		x="0" y="0"
		width="${width}" height="${height}"
		fill="${fgcolor}" />
	<rect
		x="${border}" y="${border}"
		width="${width - border * 2}" height="${height - border * 2}"
		fill="${bgcolor}" />
	<line
		x1="${border * 2}" y1="${border * 2}"
		x2="${width - border * 2}" y2="${height - border * 2}"
		stroke-width="${border}" stroke="${fgcolor}" />
	<line
		x1="${width - border * 2}" y1="${border * 2}"
		x2="${border * 2}" y2="${height - border * 2}"
		stroke-width="${border}" stroke="${fgcolor}" />
	<rect
		x="${border}" y="${(height - textsize) / 2}"
		width="${width - border * 2}" height="${textsize}"
		fill="${bgcolor}" />
	<text
		x="${width / 2}" y="${height / 2}" dy="8"
		font-family="Helvetica" font-size="${textsize}"
		fill="${textcolor}" text-anchor="middle">${width} x ${height}</text>
 </svg>`);
 image.overlayWith(thumnail)[format]().pipe(res);
});

app.get('/uploads/:width(\\d+)x:height(\\d+)-:image', download_image);
app.get('/uploads/_x:height(\\d+)-:image', download_image);
app.get('/uploads/:width(\\d+)x_-:image', download_image);
app.get('/uploads/:greyscale-:image', download_image);
app.post('/uploads/:image', bodyparser.raw({
	limit: '10mb',
	type: 'image/*'
}), (req, res) => {
	// let image = req.params.image.toLowerCase();
	// if (!image.match(/\.(png|jpg)/)) {
	// 	return res.status(403).end();
	// }

	// let len = req.body.length;
	// let fd = fs.createWriteStream(path.join(__dirname, 'uploads', image), {
	// 	flags: 'w+',
	// 	encoding: 'binary'
	// });

	// fd.write(req.body);
	// fd.end();

	// fd.on('close', () => {
	// 	res.send({
	// 		status: 'ok',
	// 		size: len
	// 	});
	// })
	let fd = fs.createWriteStream(req.localpath, {
		flags: 'w+',
		encoding: 'binary'
	});
	fd.end(req.body);
	fd.on('close', () => {
		res.send({status: 'ok', size: req.body.length})
	})
})

app.head('/uploads/:image', (req, res) => {
	// fs.access(
	// 	path.join(__dirname, 'uploads', req.params.image),
	// 	fs.constants.R_OK,
	// 	err => {
	// 		res.status(err ? 404 : 200);
	// 		res.end();
	// 	}
	// );
	fs.access(req.localpath, fs.constants.R_OK, err => {
		res.status(err ? 404 : 200).end();
	})
});

app.get('/uploads/:image', (req, res) => {
	// let ext = path.extname(req.params.image);
	// if (!ext.match(/^\.(png|jpg)$/)) {
	// 	return res.status(404).end();
	// }
	// let fd = fs.createReadStream(path.join(__dirname, 'uploads', req.params.image));
	// fd.on('error', e => {
	// 	if (e.code === 'ENOENT') {
	// 		res.status(404)
	// 		if (req.accepts('html')) {
	// 			res.setHeader('Content-Type', 'text/html');
	// 			res.write('<strong>Error: </strong> Image not found')
	// 		}
	// 		return res.end();
	// 	}
	// 	res.status(500).end();
	// });
	// res.setHeader('Content-Type', 'image/' + ext.substr(1));
	// fd.pipe(res)

	let fd = fs.createReadStream(req.localpath);

	fd.on('error', e => {
		res.status(e.code === 'ENOENT' ? 404 : 500).end();
	})

	res.setHeader('Content-Type', 'image/' + path.extname(req.image).substr(1));
	fd.pipe(res);
})

app.listen(3000, () => {
  console.log('ready')
})


function download_image(req, res) {
	fs.access(req.localpath, fs.constants.R_OK, err => {
		if (err) {
			return res.status(404).end();
		}
		let image = sharp(req.localpath)
			.resize(req.width, req.height, {
				fit: sharp.fit.inside,
				withoutEnlargement: false
			}).jpeg();
			if (req.greyscale) {
				image.greyscale();
			}
		res.setHeader('Content-Type', 'images/' + path.extname(req.image).substr(1));
		image.pipe(res);
	})
}








