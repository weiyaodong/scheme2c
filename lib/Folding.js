const begin = require("./AST").begin;
const define = require("./AST").define;
const if_ = require("./AST").if_;
const lambda = require("./AST").lambda;
const apply = require("./AST").apply;
const ident = require("./AST").ident;

function is_trivial(ast) {
    return ast.type === "boollit" || ast.type === "intlit" || ast.type === "ident";
}

function is_id(ast) {
    return ast.type === "lambda" && ast.params.length === 1 && ast.body.type === "ident" &&
        ast.body.name === ast.params[0];
}

function fold_application(env, ast, timer) {
    let cur_env = {}; cur_env.__proto__ = env;
    timer--;
    if (timer === 0) return ast;
    switch(ast.type) {
        case "boollit":
        case "intlit":
            return ast;
        case "ident":
            if (ast.name in cur_env) {
                return cur_env[ast.name];
            }
            return ast;
        case "apply":
            let fun = fold_application(cur_env, ast.fun, timer);
            let params = [];
            for (let i = 0; i < ast.params.length; i++) {
                params.push(fold_application(cur_env, ast.params[i], timer));
            }
            if (fun.type === "boollit" || fun.type === "intlit") {
                throw "Literal cannot have application";
            }
            if (is_id(fun)) {
                if (ast.params.length !== 1) {
                    throw "The parameters number doesn't fit in lambda application";
                }
                return fold_application(cur_env, params[0], timer);
            }
            if (fun.type === "lambda" && fun.params.length === params.length) {
                let flag = true;
                params.map(x => (flag &= is_trivial(x)));
                if (flag) {
                    for (let i = 0; i < fun.params.length; i++) {
                        cur_env[fun.params[i]] = params[i];
                    }
                    return fold_application(cur_env, fun.body, timer);
                }
                return apply(fun, params);
            } else if (fun.type === "lambda") {
                throw "The parameters number doesn't fit in lambda application";
            }
            return apply(fun, params);
        case "lambda":
            // the parameter of lambda may shadow the outer reference
            for (let i = 0; i < ast.params.length; i++) {
                cur_env[ast.params[i]] = ident(ast.params[i]);
            }
            return lambda(ast.params, fold_application(cur_env, ast.body, timer));
        case "set!":
        case "define":
            return define(ast.id, fold_application(cur_env, ast.body, timer));
        case "if":
            return if_(fold_application(cur_env, ast.test, timer), fold_application(cur_env, ast.tr, timer), fold_application(cur_env, ast.fa, timer));
        case "begin":
            if (ast.list.length === 1) {
                return fold_application(env, ast.list[0], timer);
            }
            let list = [];
            for (let i = 0; i < ast.list.length; i++) {
                let temp = fold_application(env, ast.list[i], timer);
                list.push(temp);
            }
            return begin(list);
        default:
            throw "What the fuck ?????";
    }
}

function fold_begin(ast) {
    switch(ast.type) {
        case "boollit":
        case "intlit":
        case "ident":
            return ast;
        case "lambda":
            return lambda(ast.params, fold_begin(ast.body));
        case "if":
            return if_(fold_begin(ast.test), fold_begin(ast.tr), fold_begin(ast.fa));
        case "define" :
        case "set!" :
            return define(ast.id, fold_begin(ast.body));
        case "apply" :
            return apply(fold_begin(ast.fun), ast.params.map(fold_begin));
        case "begin" :
            let list = [];
            for (let i = 0; i < ast.list.length; i++) {
                let cur = fold_begin(ast.list[i]);
                if (cur.type === "begin") {
                    for (let j = 0; j < cur.list.length; j++) {
                        list.push(cur.list[j]);
                    }
                } else {
                    list.push(cur);
                }
            }
            return begin(list);
        default:
            throw "What the fuck !!";
    }
}

exports.fold_application = fold_application;
exports.fold_begin = fold_begin;