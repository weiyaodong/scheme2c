let AST = require("./AST");
let ident = AST.ident;
let lambda = AST.lambda;
let apply = AST.apply;
let define = AST.define;
let setbang = AST.setbang;
let _if = AST.if_;
let begin = AST.begin;

function curry(ast) { // make all the lambda to be one-parameter
    // we assume that curry is called after the desugar process
    // so here we only handle the ast after first transformed;
    switch(ast.type) {
        case "boollit" :
        case "intlit" :
        case "ident" :
            return ast;
        case "if" :
            return _if(curry(ast.test), curry(ast.tr), curry(ast.fa));
        case "define" :
            return define(ast.id, curry(ast.body));
        case "set!" :
            return setbang(ast.id, curry(ast.body));
        case "begin" :
            return begin(ast.list.map(curry));
        case "lambda" :
            let num = ast.params.length;
            let current = lambda([ast.params[num - 1]], curry(ast.body));
            for (let i = num - 2; i >= 0; i--) {
                current = lambda([ast.params[i]], current);
            }
            return current;
        case "apply" :
            let cur = apply(curry(ast.fun), [curry(ast.params[0])]);
            for (let i = 1; i < ast.params.length; i++) {
                cur = apply(cur, [curry(ast.params[i])]);
            }
            return cur;
        default :
            throw "What the fuck ???";
    }
}

exports.curry = curry;