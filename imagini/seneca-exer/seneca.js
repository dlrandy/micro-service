const seneca = require('seneca');
const service = seneca();
service.use('./image_plugin.js', {path:__dirname + '/uploads'});

service.listen(3000)















