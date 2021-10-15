class EventNative{
    constructor() {
        this.data = {};
    }
    on(key, fun) {
        if (typeof fun !== "function") {
            return;
        }
        if (!this.data[key]) {
            this.data[key] = [];
        }
        this.data[key].push(fun);
    }
    emit(key, msg) {
        if (!this.data[key]) {
            return;
        }
        this.data[key].forEach(fun => {
            fun(msg);
        });
    }
    remove(key, fun) {
        if (fun && typeof fun !== "function" || !this.data[key]) {
            return;
        }
        if (!fun) {
            delete this.data[key];
        } else {
            this.data[key] = this.data[key].filter(item => item !== fun);
        }
    }
}