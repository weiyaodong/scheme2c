const boolliteral = require("./AST").boolliteral;
const is_primitive = require("./Constant").is_primitive;
const begin = require("./AST").begin;
const define = require("./AST").define;
const if_ = require("./AST").if_;
const lambda = require("./AST").lambda;
const apply = require("./AST").apply;
const ident = require("./AST").ident;

let sym_counter = 0;

function reset_sym_counter() {
    sym_counter = 0;
}

function gensym() {
    return "c" + sym_counter++;
}

function _cps_transform(ast, cont) { // convert the original ast to continuation-passing-style
    switch(ast.type) {
        case "boollit" :
        case "intlit" :
            return apply(cont, [ast]);
        case "ident" :
            if (ast.name === "call/cc" || ast.name === "call-with-current-continuation") {
                let c1 = gensym();
                let f = gensym();
                let x = gensym();
                let c2 = gensym();
                let callcc =
                    lambda([f, c1],
                        apply(ident(f),
                            [lambda([x, c2],
                                apply(ident(c1), [ident(x)])), ident(c1)]));
                return apply(cont, [callcc]);
            }
            return apply(cont, [ast]);
        case "if" :
            let testc = gensym();
            // cps transform on branch
            return _cps_transform(ast.test,
                lambda([testc],
                    if_(ident(testc),
                        _cps_transform(ast.tr, cont),
                        _cps_transform(ast.fa, cont))));
        case "define" : // define is dealed the same with setbang
        case "set!" :
            let c2 = gensym();
            // feed the continuation with a unit value
            return _cps_transform(ast.body,
                lambda([c2],
                    begin([define(ast.id, ident(c2)),
                        apply(cont, [boolliteral(false)])])));
        case "begin" :
            let num = ast.list.length;
            let current = _cps_transform(ast.list[num - 1], cont);
            for (let i = num - 2; i >= 0; i--) {
                current = _cps_transform(ast.list[i], lambda([gensym()], current));
            }
            return current;
        case "lambda" :
            let c3 = gensym();
            let clambda = lambda([...ast.params, c3], _cps_transform(ast.body, ident(c3)));
            return apply(cont, [clambda]);
        case "apply" :
            let vars = [];
            for (let i = 0; i < ast.params.length; i++) {
                vars.push(gensym());
            }
            let g = gensym();
            let cur;
            if (ast.fun.type === "ident" && is_primitive(ast.fun.name)) {
                cur = apply(cont, [apply(ast.fun, vars.map(ident))]);
            } else {
                cur = _cps_transform(ast.fun,
                    lambda([g],
                        apply(ident(g),
                            [...(vars.map(ident)), cont])));
            }
            for (let i = 0; i < ast.params.length; i++) {
                cur = _cps_transform(ast.params[i],
                    lambda([vars[i]],
                        cur));
            }
            return cur;
        default :
            throw "What the fuck ????";
    }
}

function cps_transform(ast) {
    reset_sym_counter();
    return _cps_transform(ast, lambda(["x"], ident("x")));
}

exports.cps_transform = cps_transform;