const MyPromise = require('./MyPromise.js');
const request = require('request');


var promise1 = new MyPromise((resolve) => {
    console.log('promise1');
    request('https://www.baidu.com', function (error, response) {
        if (!error && response.statusCode == 200) {
            resolve('request1 success');
        }
    });
});

promise1.then(function (value) {
    console.log(value);
});


var promise2 = new MyPromise((resolve, reject) => {
    request('https://www.baidu.com', function (error, response) {
        if (!error && response.statusCode == 200) {
            reject('request2 failed');
        }
    });
});

promise2.then(function (value) {
    console.log(value);
}, function (reason) {
    console.log(reason);
});




let map = new Map([
    ['key1','vlaue1']
])

map.set('key2','value2');



let p = MyPromise.all(Array(8).fill(0))

console.log(p);

p.then((res)=>{
    console.log(res);
})