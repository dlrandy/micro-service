const seneca = require('seneca');
const service = seneca({log: 'silient'});
const stack = [];

service.add('stack:push,value:*', (msg, next) => {
  stack.push(msg.value);
  next(null, stack);
})

service.add('stack:pop', (msg, next) => {
  stack.pop();
  next(null, stack);
});

service.add('stack:get', (msg, next) => {
  next(null, stack);
})


service.listen(3000)














