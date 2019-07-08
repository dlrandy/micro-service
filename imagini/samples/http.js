const http = require('http');
http.request('http://www.baidu.com')
.once('response', res => {
  console.log(res.headers);
}).end();

console.log('getting google.com headers');










