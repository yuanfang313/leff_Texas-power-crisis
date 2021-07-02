/**
 * utils 为工具函数，对原生API做兼容性处理及提取公共方法
 */
 const utils = {
    // 鼠标滚轮事件
    getWheelDelta(event) {
        if (event.wheelDelta) {
            // 第一次调用之后惰性载入
            this.getWheelDelta = event => event.wheelDelta;

            // 第一次调用使用
            return event.wheelDelta;
        }
        // 兼容火狐
        this.getWheelDelta = event => -event.detail;
        return -event.detail;
    },
    // 防抖动函数，method 回调函数，context 上下文，event 传入的时间，delay 延迟函数
    // 调用的时候直接执行，注意和 throttle 在使用的时候的区别
    debounce(method, context, event, delay) {
        clearTimeout(method.tId);
        method.tId = setTimeout(() => {
            method.call(context, event);
        }, delay);
    },
    // 截流函数，method 回调函数，context 上下文，delay 延迟函数，
    // 返回的是一个函数
    throttle(method, context, delay) {
        let wait = false;
        return function (...args) {
            if (!wait) {
                method.apply(context, args);
                wait = true;
                setTimeout(() => {
                    wait = false;
                }, delay);
            }
        };
    },
    // 删除 类名
    deleteClassName(el, className) {
        if (el.classList.contains(className)) {
            el.classList.remove(className);
        }
    },
    // polyfill Object.assign
    polyfill() {
        if (typeof Object.assign !== 'function') {
            Object.defineProperty(Object, 'assign', {
                value: function assign(target) {
                    if (target == null) {
                        throw new TypeError('Cannot convert undefined or null to object');
                    }
                    const to = Object(target);
                    for (let index = 1; index < arguments.length; index++) {
                        const nextSource = arguments[index];
                        if (nextSource != null) {
                            for (const nextKey in nextSource) {
                                if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                    to[nextKey] = nextSource[nextKey];
                                }
                            }
                        }
                    }
                    return to;
                },
                writable: true,
                configurable: true,
            });
        }
    },
};
/**
 * 全屏滚动逻辑
 */
class PureFullPage {
    constructor(options) {
        // 默认配置
        const defaultOptions = {
            isShowNav: true,
            delay: 400,
            definePages: () => {},
        };
        utils.polyfill();
        // 合并自定义配置
        this.options = Object.assign(defaultOptions, options);
        // 将用户自定义函数绑定到实例 this
        this.options.definePages = this.options.definePages.bind(this);
        // 获取翻页容器
        this.container = document.querySelector('#pureFullPage');
        // 获取总页数，创建右侧点导航时用
        this.pages = document.querySelectorAll('.page');
        this.pagesNum = this.pages.length;
        // 初始化右侧点导航，以备后用
        this.navDots = [];
        // 获取当前视图高度
        this.viewHeight = document.documentElement.clientHeight;
        // 当前位置，负值表示相对视图窗口顶部向下的偏移量
        this.currentPosition = 0;
        // 截流/间隔函数延迟时间，毫秒
        this.DELAY = this.options.delay;
        // 检测滑动方向，只需要检测纵坐标
        this.startY = undefined;

        /**
         * 初始化
         */
        this.init();
    }
    // window resize 时重新获取位置
    getNewPosition() {
        this.viewHeight = document.documentElement.clientHeight;
        this.container.style.height = `${this.viewHeight}px`;
        let activeNavIndex;
        this.navDots.forEach((e, i) => {
            if (e.classList.contains('active')) {
                activeNavIndex = i;
            }
        });
        this.currentPosition = -(activeNavIndex * this.viewHeight);
        this.turnPage(this.currentPosition);
    }
    handleWindowResize(event) {
        // 设置防抖动函数
        utils.debounce(this.getNewPosition, this, event, this.DELAY);
    }
    // 页面跳转
    turnPage(height) {
        this.container.style.top = `${height}px`;
    }
    // 随页面滚动改变样式
    changeNavStyle(height) {
        if (this.options.isShowNav) {
            this.navDots.forEach(el => {
                utils.deleteClassName(el, 'active');
            });

            const i = -(height / this.viewHeight);
            this.navDots[i].classList.add('active');
        }
    }
    // 创建右侧点式导航
    createNav() {
        const nav = document.createElement('div');
        nav.className = 'nav';
        this.container.appendChild(nav);

        // 有几页，显示几个点
        for (let i = 0; i < this.pagesNum; i++) {
            nav.innerHTML += '<p class="nav-dot"><span></span></p>';
        }

        const navDots = document.querySelectorAll('.nav-dot');
        this.navDots = Array.prototype.slice.call(navDots);

        // 添加初始样式
        this.navDots[0].classList.add('active');

        // 添加点式导航点击事件
        this.navDots.forEach((el, i) => {
            el.addEventListener('click', () => {
                // 页面跳转
                this.currentPosition = -(i * this.viewHeight);
                // 处理用户自定义函数
                this.options.definePages();
                this.turnPage(this.currentPosition);

                // 更改样式
                this.navDots.forEach(el => {
                    utils.deleteClassName(el, 'active');
                });
                el.classList.add('active');
            });
        });
    }
    goUp() {
        // 只有页面顶部还有页面时页面向上滚动
        if (-this.container.offsetTop >= this.viewHeight) {
            // 重新指定当前页面距视图顶部的距离 currentPosition，实现全屏滚动，currentPosition 为负值，越大表示超出顶部部分越少
            this.currentPosition = this.currentPosition + this.viewHeight;

            this.turnPage(this.currentPosition);
            this.changeNavStyle(this.currentPosition);
            // 处理用户自定义函数
            this.options.definePages();
        }
    }
    goDown() {
        // 只有页面底部还有页面时页面向下滚动
        if (-this.container.offsetTop <= this.viewHeight * (this.pagesNum - 2)) {
            // 重新指定当前页面距视图顶部的距离 currentPosition，实现全屏滚动，currentPosition 为负值，越小表示超出顶部部分越多
            this.currentPosition = this.currentPosition - this.viewHeight;

            this.turnPage(this.currentPosition);
            this.changeNavStyle(this.currentPosition);

            // 处理用户自定义函数
            this.options.definePages();
        }
    }
    // 鼠标滚动逻辑（全屏滚动关键逻辑）
    scrollMouse(event) {
        const delta = utils.getWheelDelta(event);
        // delta < 0，鼠标往前滚动，页面向下滚动
        if (delta < 0) {
            this.goDown();
        } else {
            this.goUp();
        }
    }
    // 触屏事件
    touchEnd(event) {
        const endY = event.changedTouches[0].pageY;
        if (endY - this.startY < 0) {
            // 手指向上滑动，对应页面向下滚动
            this.goDown();
        } else {
            // 手指向下滑动，对应页面向上滚动
            this.goUp();
        }
    }
    // 初始化函数
    init() {
        this.container.style.height = `${this.viewHeight}px`;
        // 创建点式导航
        if (this.options.isShowNav) {
            this.createNav();
        }
        // 设置截流函数
        const handleMouseWheel = utils.throttle(this.scrollMouse, this, this.DELAY);

        // 鼠标滚轮监听，火狐鼠标滚动事件不同其他
        if (navigator.userAgent.toLowerCase().indexOf('firefox') === -1) {
            document.addEventListener('mousewheel', handleMouseWheel);
        } else {
            document.addEventListener('DOMMouseScroll', handleMouseWheel);
        }

        // 手机触屏屏幕
        document.addEventListener('touchstart', event => {
            this.startY = event.touches[0].pageY;
        });
        const handleTouchEnd = utils.throttle(this.touchEnd, this, 500);
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchmove', event => {
            event.preventDefault();
        });

        // 窗口尺寸变化时重置位置
        window.addEventListener('resize', this.handleWindowResize.bind(this));
    }
}