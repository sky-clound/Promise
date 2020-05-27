// 自定义promise函数模块
// 匿名函数自定义 IIFE
(function (window) {
    const PENDING = 'pending'
    const RESOLVE = 'resolved'
    const REJECT = 'rejected'

    // Promise构造函数
    // excutor执行器函数（同步执行）
    function Promise(excutor) {

        const self = this
        self.status = PENDING //给promise对象指定一个status属性，初始值为pending
        self.data = undefined //给配promise对象指定一个用于存储结果数据的属性
        self.callbcak = []  //每个元素的结构{onResolved(){},onRejected(){}}

        function resolve(value) {
            // 改变状态
            self.status = RESOLVE
            // 保存数据
            self.data = value
            //如果有待执行的callback函数,立即异步执行回调函数onResolved，即在改变状态之前成功或者失败的构造函数已经指定了,那么状态改变时直接异步执行就可以了
            if (self.callbcak.length > 0) {
                setTimeout(function () {
                    self.callbcak.forEach(callbcaksObj => {
                        callbcaksObj.onResolved(value)
                    });
                })
            }
        }

        function reject(reason) {
            // 如果当前状态不等于PENDING那么直接return 因为状态只能改变一次
            if (self.status != PENDING) {
                return
            }
            // 改变状态
            self.status = REJECT
            // 保存数据
            self.data = reason
            //如果有待执行的callback函数,立即异步执行回调函数onRejected，即在改变状态之前成功或者失败的构造函数已经指定了,那么状态改变时直接异步执行就可以了
            if (self.callbcak.length > 0) {
                setTimeout(function () {
                    self.callbcak.forEach(callbcaksObj => {
                        callbcaksObj.onRejected(reason)
                    });
                })
            }
        }
        // 立即同步执行excutor  这一部分和上面的相当于在一个((resolve,reject)=>{ })
        try {
            excutor(resolve, reject)
        } catch (error) {  //如果执行器抛出异常，promise对象变为rejected状态
            reject(error)
        }

    }

    /* Promise原型对象的then()
    指定成功和失败的回调函数
    返回一个新的promise对象 promise成功或者失败由resolve或者reject决定 */
    Promise.prototype.then = function (onResolved, onRejected) {

        onResolved = typeof onResolved === 'function' ? onResolved : value => value //向后传递成功的value
        //    当then的方法中没有设置onRejectrd那么抛出异常（实现异常穿透的关键步骤）
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }  //向后传递失败的reason

        const self = this
        //先指定回调函数然后在改变状态
        // 返回一个新的promise
        return new Promise((resolve, reject) => {
            if (self.status === PENDING) {
                self.callbcak.push({
                    onRejected(value) {
                        // 因为这一部分重复使用很多次所以进行封装
                        try {
                            const result = onResolved(self.data)
                            if (result instanceof Promise) {
                                result.then(
                                    value => {  //当result成功时，让return的promise也成功
                                        resolve(value)
                                    },
                                    reason => {  //当result失败时，让return的promise也失败
                                        reject(reason)
                                    }
                                )
                                //  方法二：
                                // result.then(resolve,reject)
                            }
                            else {
                                resolve(result)
                            }
                        } catch (error) {
                            reject(error)
                        }
                    },
                    onResolved(reason) {
                        try {
                            const result = onResolved(self.data)
                            if (result instanceof Promise) {
                                result.then(
                                    value => {  //当result成功时，让return的promise也成功
                                        resolve(value)
                                    },
                                    reason => {  //当result失败时，让return的promise也失败
                                        reject(reason)
                                    }
                                )
                                //  方法二：
                                // result.then(resolve,reject)
                            }
                            else {
                                resolve(result)
                            }
                        } catch (error) {
                            reject(error)
                        }
                    }
                })
            } else if (self.status === RESOLVE) {
                // 立即异步执行成功的回调函数
                setTimeout(() => {
                    /*    返回的promise的结果由onRejected或者onResolved的结果而确定
                       onRejected或者onResolved的结果而确定分为3中情况
                       1、如果抛出异常，return的额promise就会失败，reason就是error
                       2、  回调函数异步执行返回不是promise，return的promise就会成功，value是返回的值
                       3、如果回调函数返回是promise，return的promise结果就是这个promise的结果
   
                       1、第一种情况，抛出异常为失败所以通过reject来显示 */
                    try {
                        //   first、 该处用来处理第一次执行resolve或者reject后的value或者reason的处理
                        const result = onResolved(self.data)
                        if (result instanceof Promise) {
                            /*    3、如果回调函数返回是promise，return的promise结果就是这个promise的结果。
                               这种情况在原装的promise中是以return new promise.resolve(value)的形态呈现。
                               要想知道返回的是否成功必须取回promise的值，因此用then的方法来获取promise的值以及状态
                               如果成功说明原装代码为return new promise.resolve(value)，返回的下一个状态也应该是成功，所以调用resolve
                               如果失败说明原装代码为return new promise.reject(reason)，返回的下一个状态也应该是失败，所以调用reject
                                  方法一：   */
                            result.then(
                                value => {  //当result成功时，让return的promise也成功
                                    resolve(value)
                                },
                                reason => {  //当result失败时，让return的promise也失败
                                    reject(reason)
                                }
                            )
                            //  方法二：
                            // result.then(resolve,reject)
                        }
                        else {
                            // 2、回调函数异步执行返回不是promise，return的promise就会成功，value是返回的值
                            //   成功 此时返回的是一个数字不是一个promise对象所以value为result
                            resolve(result)
                        }
                    } catch (error) {
                        // second、该处用于执行第二次的resolve或者reject，以便为下面then方法的调用
                        reject(error)
                    }
                })

            } else {
                setTimeout(() => {

                    try {

                        const result = onRejected(self.data)
                        if (result instanceof Promise) {
                            result.then(
                                value => {  //当result成功时，让return的promise也成功
                                    resolve(value)
                                },
                                reason => {  //当result失败时，让return的promise也失败
                                    reject(reason)
                                }
                            )
                            //  方法二：
                            // result.then(resolve,reject)
                        }
                        else {
                            resolve(result)
                        }
                    } catch (error) {
                        reject(error)
                    }
                })

            }
        })
    }

    //   Promise原型对象的catch()
    //   指定失败的回调函数
    // 返回新的promise对象
    Promise.prototype.catch = function (onRejected) {

    }

    //   Promise函数对象的resolve方法

    Promise.resolve = function (value) {

    }

    //   Promise函数对象的reject方法
    //  返回一个指定reason的失败promise
    Promise.reject = function (reason) {

    }

    //   Promise函数对象的all方法
    //   返回一个promise,只有所有的promise都成功才返回成功,否则只要一个失败的就失败
    Promise.all = function (promises) {

    }

    //   Promise函数对象的race方法
    // 返回一个promise,其结果有第一个完成的promise决定
    Promise.race = function (promises) {

    }


    //   向外暴露Promise函数
    window.Promise = Promise
})(window)