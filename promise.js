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
            if (self.status != PENDING) {
                return
            }
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

     /* 
     Promise原型对象的then()
     指定成功和失败的回调函数
     返回一个新的promise对象 promise成功或者失败由resolve或者reject决定 */
     Promise.prototype.then = function (onResolved, onRejected) {

        onResolved = typeof onResolved === 'function' ? onResolved : value => value //向后传递成功的value
        //    当then的方法中没有设置onRejectrd那么抛出异常（实现异常穿透的关键步骤）
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }  //向后传递失败的reason

        const self = this
        //先指定回调函数然后在改变状态
        return new Promise((resolve, reject) => {
            //  调用指定的回调函数处理，根据执行的结果，改变return的promise的状态
            function handle(resOrRejFun) {
                try {
                    const result = resOrRejFun(self.data)
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
                        console.log(result)
                    }
                } catch (error) {
                    reject(error)
                }
            }

            if (self.status === PENDING) {
                self.callbcak.push({
                   
                    onResolved(value) {
                        handle(onResolved)
                    },
                     onRejected(reason) {
                        handle(onRejected)
                    }
                })
            } else if (self.status === RESOLVE) {  //如果当前是resolved状态，异步执行onResolved并改变return的promise状态
                setTimeout(() => {
                    handle(onResolved)
                })

            } else {
                setTimeout(() => {  //如果当前是rejected状态，异步执行onRejected并改变return的promise状态
                    handle(onRejected)

                })

            }
        })


     }

      /* 
      Promise原型对象的catch()
      指定失败的回调函数
      返回新的promise对象 */
     Promise.prototype.catch = function (onRejected) {
        return this.then(undefined, onRejected)
     }



     /*  Promise函数对象的resolve方法
     返回一个指定结果成功的promise
     调用resolve方法根据value的值来判断返回的promise对象是成功还是失败
     */
     Promise.resolve = function (value) {
        // 返回一个成功或者失败的promise
        // value可能是一个数值，也可能是一个新的promise对象
        return new Promise((resolve, reject) => {
            if (value instanceof Promise) { //这一部分和then类似
                value.then(resolve, reject)
            }
            else {
                // 当value是数值时，直接返回成功
                resolve(value)
            }
        })

     }

     /*    Promise函数对象的reject方法
     返回一个指定reason的失败promise */
     Promise.reject = function (reason) {
        // 只能返回一个失败的promise
        return new Promise((resolve, reject) => {
            reject(reason)
        })
     }

     /*Promise函数对象的all方法
      返回一个promise,只有所有的promise都成功才返回成功,否则只要一个失败的就失败 */
     Promise.all = function (promises) {
        //成功返回一个数字，先定义一个数组,并先确定数组的长度
        const valueArr = new Array(promises.length)
        // 因为value为异步执行，所以无法通过index的值来判断是否结束，因此需要设置一个累加器来判断是否结束
        //    用来保存成功promise的数量
        let count = 0;
        return new Promise((resolve, reject) => {
            //    all方法所有的promise都成功才成功返回一个成功的数组,只要有一个失败就失败
            // 因为promises是一个数组所以需要遍历数组,因为要判断每一个promise是否成功所以得取出每个promise的结果，因此得用then方法
            promises.forEach((p, index) => {
                Promise.resolve(p).then(
                    value => {
                        count++
                        valueArr[index] = value;
                        if (count == promises.length) {
                            resolve(valueArr)
                        }
                    },
                    reason => {  //只要有一个失败那么久返回失败，失败的数值时reason
                        reject(reason)
                    }
                )

            })

        })
     }

     /*   Promise函数对象的race方法
     返回一个promise,其结果有第一个完成的promise决定 */
     Promise.race = function (promises) {
        return new Promise((resolve, reject) => {
            promises.forEach((p, index) => {
                // all或者race数组中不一定只是promise还可能是一个数值，因此需要使用Promise.resolve(p)来代替p，当为数值时返回成功，其他情况根据p的值而确定
                Promise.resolve(p).then(
                    value => {
                        resolve(value)
                    },
                    reason => {  //只要有一个失败那么久返回失败，失败的数值时reason
                        reject(reason)
                    }
                )

            })
        })

     }

     //    返回一个promise对象，他在指定的时间后才确定结果
     Promise.resolveDelay=function(value,time)
    {
        return new Promise((resolve,reject)=>{
            setTimeout(() => {
                if(value instanceof Promise)
                {
                    value.then(resolve,reject)
                }
                else
                {
                    resolve(value)
                }
            }, time);
        })
     }

     //    返回一个promise对象，他在指定的时间后才确定失败
     Promise.rejectDelay=function(reason,time)
    {
        return new Promise((resolve,reject)=>{
            setTimeout(() => {
               reject(reason)
            }, time);
        })


     }


     //   向外暴露Promise函数
    window.Promise = Promise
})(window)