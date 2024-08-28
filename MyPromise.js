const PENDING = 'pending';
const FULLFILLED = 'fullfilled';
const REJECTED = 'rejected';


function MyPromise(fn) {
    // promise中有三个最基础的数据：value、reason、status
    // 1. 状态：pending、fullfilled、rejected
    // 2. 成功的值：value
    // 3. 失败的原因：reason
    // 异步操作成功后的数据通过value传递，失败后的数据通过reason传递给then方法
    this.value = null;
    this.reason = null;
    this.status = PENDING;

    //
    this.onFullfilledCallback = [];
    this.onRejectedCallback = [];

    // promise中还有两个私有函数：resolve、reject，作用时改变promise的状态，并将value或reason传递到promise中
    /**
     * resolve函数：当异步操作成功时，promise使用者调用resolve函数。将promise状态从pending变为fullfilled，并将value值传递到promise中。
     * @param {*} value 
     */
    const resolve = (value) => {
        if (this.status === PENDING) {
            this.value = value;
            this.status = FULLFILLED;
            this.onFullfilledCallback.forEach((callback) => {
                callback(value);
            })
        }
    }

    /**
     * reject函数：当异步操作失败时，promise使用者调用reject函数。将promise状态从pending变为rejected，并将reason值传递到promise中。
     * @param {Error} reason 
     */
    const reject = (reason) => {
        if (this.status === PENDING) {
            this.reason = reason;
            this.status = REJECTED;
            this.onRejectedCallback.forEach((callback) => {
                callback(reason);
            })
        }
    }

    // 在执行回调函数时，可能会抛出异常，因此需要try-catch包裹，并将异常使用reject函数处理
    try {
        fn(resolve, reject);
    } catch (error) {
        reject(error);
    }
}

/**
 * promise解决过程，将回调函数返回值x与新promise实例进行绑定，使得新promise实例能通过then访问到返回值x
 * @param {MyPromise} promise // 新创建的promise实例
 * @param {*} x // 回调函数返回值
 * @param {Function} resolve // 新promise实例的resolve函数
 * @param {Function} reject // 新promise实例的reject函数
 * @returns 
 */
function resolvePromise(promise, x, resolve, reject) {
    // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
    // 这是为了防止死循环
    if (promise === x) {
        return reject(new TypeError('The promise and the return value are the same'));
    }

    // 如果 x 是Promise
    if (x instanceof MyPromise) {
        // 如果 x 为 Promise ，则使 promise 接受 x 的状态
        // 也就是继续执行x，如果执行的时候拿到一个y，还要继续解析y
        // 这个if跟下面判断then然后拿到执行其实重复了，可有可无
        // 这里的x.then其实是MyPromise.prototype.then的一次递归调用（在函数定义时就调用本函数）
        x.then(function (y) {
            resolvePromise(promise, y, resolve, reject);
        }, reject);
    }
    // 如果 x 为对象或者函数
    else if (typeof x === 'object' || typeof x === 'function') {
        // 这个坑是跑测试的时候发现的，如果x是null，应该直接resolve
        if (x === null) {
            // 由于闭包的存在，在此处调用函数可以修改promise2的status和value
            return resolve(x);
        }

        try {
            // 把 x.then 赋值给 then 
            var then = x.then;
        } catch (error) {
            // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
            // 同理，修改promise2的status和value
            return reject(error);
        }

        // 如果 then 是函数
        if (typeof then === 'function') {
            // 定义变量标记回调是否发生。作用是什么？
            var called = false;
            // 将 x 作为函数的作用域 this 调用之
            // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise
            // 名字重名了，我直接用匿名函数了
            try {
                // 同理，此处也为递归调用
                // 如果返回值不普通（是个promise），则继续调用then以获取其promise中包含的solve值
                then.call(
                    x,
                    // 假设这个promise是成功的
                    function (y) {
                        // 那么y就是resolve的值
                        if (called) return;
                        called = true;
                        // 重新尝试将该值与promise绑定
                        resolvePromise(promise, y, resolve, reject);
                    },
                    // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
                    function (r) {
                        if (called) return;
                        called = true;
                        // 失败则直接绑定错误结果即可
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
        // 如果是普通的值，直接resolve将值传递给目标promise即可
        resolve(x);
    }
}

/**
 * promise的then方法
 * 1. 将resolve的值传递给onFullfilled
 * 2. 获取onFullfilled可能的返回值，并将其作为新promise的resolve的值，并返回新promise
 * @param {*} onFullfilled 
 * @param {*} onRejected 
 * @returns {MyPromise} 
 */
MyPromise.prototype.then = function (onFullfilled, onRejected) {
    // 如果 onFullfilled 不是函数，将其转换为函数
    if (typeof onFullfilled !== 'function') {
        onFullfilled = function (value) {
            return value;
        }
    }

    // 如果 onRejected 不是函数，将其转换为一个抛出错误的函数
    if (typeof onRejected !== 'function') {
        onRejected = function (reason) {
            throw reason;
        }
    }

    // 如果在执行then方法时，promise已经处于fulfilled状态，返回一个新的promise
    if (this.status === FULLFILLED) {
        let promise2 = new MyPromise((resolve, reject) => {
            // 使用宏任务，确保onFullfilled在当前任务执行完毕后执行
            setTimeout(() => {
                // onFullfilled、resolvePromise均可能抛出错误
                try {
                    // 获取onFullfilled的返回值，并运行promise解决过程
                    let x = onFullfilled(this.value);
                    resolvePromise(promise2, x, resolve, reject);
                } catch (error) {
                    reject(error);
                }
            },0)
        })

        return promise2;
    }

    // 如果在执行then方法时，promise已经处于rejected状态，返回一个新的promise
    if (this.status === REJECTED) {
        let promise2 = new MyPromise((resolve, reject) => {
            // 使用宏任务，确保promise2已经完成初始化
            setTimeout(() => {
                //onRejected、resolvePromise均可能抛出错误
                try {
                    // 获取onRejected的返回值，并运行promise解决过程
                    let x = onRejected(this.reason);
                    // 在promise内部调用，确保能使用resolve和reject函数
                    resolvePromise(promise2, x, resolve, reject); // 为什么在这里能够访问到promise2？
                    // 解释：因为在new MyPeomise时，setTimeout中的回调函数并没有立即被执行，
                    // 而是被放入了宏任务队列中，当回调函数被取出执行时，promise2已经创建完成
                    // 同时函数被定义时有闭包，因此可以访问到promise2
                } catch (error) {
                    reject(error);
                }
            },0)
        })

        return promise2;
    }

    // 如果在执行then方法时，promise尚处于pending状态，将onFullfilled和onRejected函数存入队列，等待状态改变后执行
    if (this.status === PENDING) {
        let promise2 = new MyPromise((resolve, reject) => {
            this.onFullfilledCallback.push(() => {
                setTimeout(() => {
                    try {
                        // 由于前面已经将onFullfilled转成了函数，此时的判断时不必要的
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
                        // 由于前面已经将onRejected转成了函数，此时的判断时不必要的
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

// 检测用代码
MyPromise.deferred = function() {
    var result = {};
    result.promise = new MyPromise(function(resolve, reject){
      result.resolve = resolve;
      result.reject = reject;
    });
  
    return result;
  }
  

module.exports = MyPromise;

