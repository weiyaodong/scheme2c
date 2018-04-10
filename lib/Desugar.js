const begin = require("./AST").begin;
const define = require("./AST").define;
const if_ = require("./AST").if_;
const lambda = require("./AST").lambda;
const apply = require("./AST").apply;
const boolliteral = require("./AST").boolliteral;
const ident = require("./AST").ident;
const setbang = require("./AST").setbang;
const cond = require("./AST").cond;
const and = require("./AST").and;
const or = require("./AST").or;

function transform_cond(ast) {
    let num = ast.cases.length;
    let f1 = ast.cases[num - 1][1];
    let current = if_(desugar(ast.cases[num - 1][0]), desugar(f1), boolliteral(false));
    for (let i = num - 2; i >= 0; i--) {
        current = if_(desugar(ast.cases[i][0]), desugar(ast.cases[i][1]), current);
    }
    return current;
}

function transform_let(ast) {
    let params = [];
    let values = [];
    ast.bindings.map(pa => {
        params.push(pa[0].name);
        values.push(pa[1]);
    });
    return apply(lambda(params, desugar(ast.body)), values);
}

function transform_or(ast) {
    let num = ast.params.length;
    let current = desugar(ast.params[num - 1]);
    for (let i = num - 2; i >= 0; i--) {
        current = if_(desugar(ast.params[i]), boolliteral(true), current);
    }
    return current;
}

function transform_and(ast) {
    let num = ast.params.length;
    let current = desugar(ast.params[num - 1]);
    for (let i = num - 2; i >= 0; i--) {
        current = if_(desugar(ast.params[i]), current, boolliteral(false))
    }
    return current;
}

function desugar(ast) {
    switch(ast.type) {
        case "let" :
            return transform_let(ast);
        case "cond" :
            return transform_cond(ast);
        case "or" :
            return transform_or(ast);
        case "and" :
            return transform_and(ast);
        case "boollit" :
        case "intlit" :
        case "ident" :
            return ast;
        case "if" :
            return if_(desugar(ast.test), desugar(ast.tr), desugar(ast.fa));
        case "define" :
            return define(ast.id, desugar(ast.body)); // note that we regard define as the same thing as set!
        case "lambda" :
            return lambda(ast.params, desugar(ast.body));
        case "set!" :
            return setbang(ast.id, desugar(ast.body));
        case "begin" :
            return begin(ast.list.map(desugar));
        case "apply" :
            return apply(desugar(ast.fun), ast.params.map(desugar));
        default :
            throw "What the fuck ???";
    }
}

exports.desugar = desugar;