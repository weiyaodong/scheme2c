const Tokenizer = require("./Tokenizer");
const is_keyword = require("./Constant").is_keyword;
const begin = require("./AST").begin;
const define = require("./AST").define;
const if_ = require("./AST").if_;
const let_ = require("./AST").let_;
const lambda = require("./AST").lambda;
const apply = require("./AST").apply;
const boolliteral = require("./AST").boolliteral;
const ident = require("./AST").ident;
const intliteral = require("./AST").intliteral;
const setbang = require("./AST").setbang;
const cond = require("./AST").cond;
const and = require("./AST").and;
const or = require("./AST").or;

function sexpToAST(sexp) {
    if (sexp instanceof Array) { // nested S Expression
        let first = sexp[0];
        if (is_keyword(first)) {
            switch(first) {
                case "define" :
                    if (sexp.length < 3) {
                        throw "define sexp length " + sexp.length + " is less than 3";
                    }
                    let body3 = sexpToAST(sexp[2]); // get the last
                    if (sexp.length > 3) {
                        let temp = [body3];
                        for (let i = 3; i < sexp.length; i++) {
                            temp.push(sexpToAST(sexp[i]));
                        }
                        body3 = begin(temp);
                    }
                    if (sexp[1] instanceof Array) {
                        return define(sexpToAST(sexp[1][0]), lambda(sexp[1].slice(1, sexp[1].length), body3));
                    }
                    return define(sexpToAST(sexp[1]), body3);
                case "lambda" :
                    let params = sexp[1];
                    if (sexp.length < 3) {
                        throw "lambda expression length less than 3";
                    }
                    if (!(sexp[1] instanceof Array)) {
                        throw "parameters of lambda must be a list";
                    }
                    let body;
                    if (sexp.length > 3) {
                        body = [];
                        for (let i = 2; i < sexp.length; i++) {
                            body.push(sexpToAST(sexp[i]));
                        }
                        body = begin(body);
                    } else {
                        body = sexpToAST(sexp[2]);
                    }
                    return lambda(params, body);
                case "set!" :
                    let id = sexp[1];
                    if (sexp[1] instanceof Array) {
                        throw "First parameter of set! must be an identifier";
                    }
                    if (sexp.length !== 3) {
                        throw "set! sexp length " + sexp.length + " is not 3";
                    }
                    return setbang(id, sexpToAST(sexp[2]));
                case "cond" :
                    if (sexp.length < 2) {
                        throw "condition expression length must be greater than 2";
                    }
                    let cases = [];
                    for (let i = 1; i < sexp.length; i++) {
                        if (!(sexp[i] instanceof Array) || sexp[i].length !== 2) {
                            throw "condition parameters must be pairs";
                        }
                        if (i !== sexp.length - 1 && sexp[i][0] === "else") {
                            throw "else clause must be the last one";
                        }
                        if (sexp[i][0] === "else") {
                            cases.push([boolliteral(true), sexpToAST(sexp[i][1])]);
                        } else {
                            cases.push([sexpToAST(sexp[i][0]), sexpToAST(sexp[i][1])]);
                        }
                    }
                    return cond(cases);
                case "if" :
                    let test = sexpToAST(sexp[1]);
                    if (sexp.length < 3) {
                        throw "The length of if expression must greater than 2";
                    }
                    if (sexp.length === 3) {
                        return if_(test, sexpToAST(sexp[2]), boolliteral(false));
                    } else {
                        return if_(test, sexpToAST(sexp[2]), sexpToAST(sexp[3]));
                    }
                case "let" :
                    let bindings = [];
                    if (!(sexp[1] instanceof Array)) {
                        throw "The first parameter of let expression must be a list";
                    }
                    for (let i = 0; i < sexp[1].length; i++) {
                        if (!(sexp[1][i] instanceof Array) || sexp[1][i].length !== 2) {
                            throw "The let bindings must be a pair";
                        }
                        if (sexp[1][i][0] instanceof Array) {
                            throw "The binding id must be an identifier";
                        }
                        bindings.push(sexp[1][i].map(x => sexpToAST(x)));
                    }
                    let body2;
                    if (sexp.length > 3) {
                        body2 = [];
                        for (let i = 2; i < sexp.length; i++) {
                            body2.push(sexpToAST(sexp[i]));
                        }
                        body2 = begin(body2);
                    } else {
                        body2 = sexpToAST(sexp[2]);
                    }
                    return let_(bindings, body2);
                case "begin" :
                    let list = [];
                    for (let i = 1; i < sexp.length; i++) {
                        list.push(sexpToAST(sexp[i]));
                    }
                    return begin(list);
                case "or" :
                    let params2 = [];
                    for (let i = 1; i < sexp.length; i++) {
                        params2.push(sexpToAST(sexp[i]));
                    }
                    return or(params2);
                case "and" :
                    let params3 = [];
                    for (let i = 1; i < sexp.length; i++) {
                        params3.push(sexpToAST(sexp[i]));
                    }
                    return and(params3);
                default:
                    throw "What the fuck?"
            }
        } else {
            let params = [];
            for (let i = 1; i < sexp.length; i++) {
                params.push(sexpToAST(sexp[i]));
            }
            return apply(sexpToAST(sexp[0]), params);
        }
    } else if (sexp[0] === "#") { // bool literal
        if (sexp[1] === "f") return boolliteral(false);
        else if (sexp[1] === "t") return boolliteral(true);
        else throw "Illegal bool literal " + sexp;
    } else if (!isNaN(parseInt(sexp))) { // numeric literal
        return intliteral(parseInt(sexp));
    } else { // identifier
        return ident(sexp);
    }
}

function wrap_up(token_stream) {
    /**
     * (op ...)
     * (op2 ...)
     *
     * =>
     *
     * (begin
     *  (op ...)
     *  (op2 ...))
     */
    token_stream.unshift("begin");
    token_stream.unshift("(");
    token_stream.push(")");
    return token_stream;
}

function parse(code) {

    let token_stream = Tokenizer.tokenize(code);
    token_stream = wrap_up(token_stream);
    let position = 0;

    function current() {
        let a = token_stream[position];
        if (a !== undefined) {
            if (a[0] === "#") {
                position++;
                return current();
            }
        }
        return token_stream[position];
    }

    function pop() {
        return token_stream[position++];
    }

    function finish() {
        return position >= token_stream.length;
    }

    function match () {
        position++;
    }

    function parseSExp() {
        let cur;
        let first;
        if ((first = pop()) === "(") {
            cur = [];
            while(!finish() && current() !== ")") cur.push(parseSExp());
            match();
            return cur;
        } else {
            return first;
        }
    }

    let sexp = parseSExp();
    return sexpToAST(sexp);
}

exports.parse = parse;