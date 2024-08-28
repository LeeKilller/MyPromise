const PENDING = 'pending';
const FULLFILLED = 'fullfilled';
const REJECTED = 'rejected';



function MyPromise(fn) {
    this.value = null;
    this.reason = null;
    this.status = PENDING;
    const that = this;

    this.onFullfilledCallback = [];
    this.onRejectedCallback = [];

    function resolve(value) {
        if (that.status === PENDING) {
            that.value = value;
            that.status = FULLFILLED;
            that.onFullfilledCallback.forEach((callback) => {
                callback(value);
            })
        }
    }

    function reject(reason) {
        if (that.status === PENDING) {
            that.reason = reason;
            that.status = REJECTED;
            that.onRejectedCallback.forEach((callback) => {
                callback(reason);
            })
        }
    }

    try {
        fn(resolve, reject);
    } catch (error) {
        reject(error);
    }
}

function resolvePromise(promise, x, resolve, reject) {
    // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
    // 这是为了防止死循环
    if (promise === x) {
        return reject(new TypeError('The promise and the return value are the same'));
    }

    if (x instanceof MyPromise) {
        // 如果 x 为 Promise ，则使 promise 接受 x 的状态
        // 也就是继续执行x，如果执行的时候拿到一个y，还要继续解析y
        // 这个if跟下面判断then然后拿到执行其实重复了，可有可无
        x.then(function (y) {
            resolvePromise(promise, y, resolve, reject);
        }, reject);
    }
    // 如果 x 为对象或者函数
    else if (typeof x === 'object' || typeof x === 'function') {
        // 这个坑是跑测试的时候发现的，如果x是null，应该直接resolve
        if (x === null) {
            return resolve(x);
        }

        try {
            // 把 x.then 赋值给 then 
            var then = x.then;
        } catch (error) {
            // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
            return reject(error);
        }

        // 如果 then 是函数
        if (typeof then === 'function') {
            var called = false;
            // 将 x 作为函数的作用域 this 调用之
            // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise
            // 名字重名了，我直接用匿名函数了
            try {
                then.call(
                    x,
                    // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
                    function (y) {
                        // 如果 resolvePromise 和 rejectPromise 均被调用，
                        // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
                        // 实现这条需要前面加一个变量called
                        if (called) return;
                        called = true;
                        resolvePromise(promise, y, resolve, reject);
                    },
                    // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
                    function (r) {
                        if (called) return;
                        called = true;
                        reject(r);
                    });
            } catch (error) {
                // 如果调用 then 方法抛出了异常 e：
                // 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
                if (called) return;

                // 否则以 e 为据因拒绝 promise
                reject(error);
            }
        } else {
            // 如果 then 不是函数，以 x 为参数执行 promise
            resolve(x);
        }
    } else {
        // 如果 x 不为对象或者函数，以 x 为参数执行 promise
        resolve(x);
    }
}


MyPromise.prototype.then = function (onFullfilled, onRejected) {
    // 不是函数，转成函数
    if (typeof onFullfilled !== 'function') {
        onFullfilled = function (value) {
            return value;
        }
    }

    if (typeof onRejected !== 'function') {
        onRejected = function (reason) {
            throw reason;
        }
    }

    if (this.status === FULLFILLED) {
        let promise2 = new MyPromise((resolve, reject) => {
            setTimeout(() => {
                try {
                    let x = onFullfilled(this.value);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (error) {
                    reject(error);
                }
            },0)
        })

        return promise2;
    }

    if (this.status === REJECTED) {
        let promise2 = new MyPromise((resolve, reject) => {
            setTimeout(() => {
                try {
                    let x = onRejected(this.reason);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (error) {
                    reject(error);
                }
            },0)
        })

        return promise2;
    }

    if (this.status === PENDING) {
        let promise2 = new MyPromise((resolve, reject) => {
            this.onFullfilledCallback.push(() => {
                setTimeout(() => {
                    try {
                        if (typeof onFullfilled !== 'function') {
                            resolve(this.value);
                        } else {
                            let x = onFullfilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                    } catch (error) {
                        reject(error);
                    }
                },0)
            })
            this.onRejectedCallback.push(() => {
                setTimeout(() => {
                    try {
                        if (typeof onRejected !== 'function') {
                            reject(this.reason);
                        } else {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                    } catch (error) {
                        reject(error);
                    }
                },0)
            })
        })

        return promise2;
    }
}

MyPromise.deferred = function() {
    var result = {};
    result.promise = new MyPromise(function(resolve, reject){
      result.resolve = resolve;
      result.reject = reject;
    });
  
    return result;
  }
  

module.exports = MyPromise;

