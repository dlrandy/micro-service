const settings = require("./mysql_setting.json");
const bodyparser = require("body-parser");
const express = require("express");
const mysql = require("mysql");
const path = require("path");
const sharp = require("sharp");

const app = express();
const db = mysql.createConnection(settings.db);

db.connect(err => {
  if (err) {
    throw err;
  }
  console.log("db: ready");

  db.query(
    `
    CREATE TABLE IF NOT EXISTS images
    (
			id           INT(11)      UNSIGNED NOT NULL AUTO_INCREMENT,
			date_created TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
			date_used    TIMESTAMP    NULL DEFAULT NULL,
			name         VARCHAR(300) NOT NULL,
			size         INT(11)      UNSIGNED NOT NULL,
			data         LONGBLOB     NOT NULL,
		PRIMARY KEY (id),
		UNIQUE KEY name (name)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `
  );
	setInterval(() => {
		db.query("DELETE FROM images " +
		         "WHERE (date_created < UTC_TIMETSTAMP - INTERVAL 1 WEEK AND date_used IS NULL) " +
		         "   OR (date_used < UTC_TIMETSTAMP - INTERVAL 1 MONTH)");
	}, 3600 * 1);
  app.param("image", (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
      return res.status(403).end();
    }
    db.query("SELECT * FROM images WHERE name = ?", [image], (err, images) => {
      if (err || !images.length) {
        return res.status(404).end();
      }
      req.image = images[0];
      return next();
    });
  });

  app.post(
    "/uploads/:name",
    bodyparser.raw({
      limit: "10mb",
      type: "image/*"
    }),
    (req, res) => {
      console.log(req.body)
      db.query(
        "INSERT INTO images SET ?",
        {
          name: req.params.name,
          size: req.body.length,
          data: req.body
        },
        err => {
          if (err) {
            return res.send({ status: "error", code: err.code });
          }
          res.send({ status: "ok", size: req.body.length });
        }
      );
    }
  );

  app.head("/uploads/:image", (req, res) => {
    res.status(200).end();
  });

  app.delete("/uploads/:image", (req, res) => {
    db.query("DELETE FROM images WHERE id = ?", [req.image.id], err => {
      return res.status(err ? 500 : 200).end();
    });
  });

  const switchs = ["y", "yes", "true", "1", "on"];
  app.get("/uploads/:image", (req, res) => {
    let { width, height, blur, sharpen, greyscale, flip, flop } = req.query;
    console.log(req.image)
    let image = sharp(req.image.data).resize(
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

		db.query("UPDATE images SET date_used = UTC_TIMESTAMP WHERE id = ?", [ req.image.id ]);

		res.setHeader("Content-Type", "image/" + path.extname(req.image.name).substr(1));
    image.pipe(res);
  });

  app.get("/stats", (req, res) => {
		db.query("SELECT COUNT(*) total" +
		         ", SUM(size) size " +
		         ", MAX(date_used) last_used " +
		         "FROM images",
		(err, rows) => {
			if (err) {
				return res.status(500).end();
			}
console.log('rows: ', rows)
			rows[0].uptime = process.uptime();

			return res.send(rows[0]);
		});
	})

  app.listen(3000, () => {
    console.log("app ready");
  });
});
