function boolliteral(value) {
    return {type : "boollit", value : value};
}

function intliteral(value) {
    return {type : "intlit", value : value};
}

function ident(name) {
    return {type : "ident", name : name};
}

function lambda(params, body){
    if (!(params instanceof Array)) throw "parameters of lambda must be a list";
    if (!body.hasOwnProperty("type")) throw "body of lambda is not an AST";
    return {type : "lambda", params : params, body : body};
}

function apply(fun, params) {
    if (!(params instanceof Array)) throw "parameters of application must be a list";
    if (!fun.hasOwnProperty("type")) throw "function of application is not an AST";
    return {type : "apply", fun : fun, params : params};
}

function define(id, body) {
    if (!id.hasOwnProperty("type")) throw "id of define must be an identifier";
    if (!body.hasOwnProperty("type")) throw "body of define must be an AST";
    return {type : "define", id : id, body : body};
}

function setbang(id, body) {
    if (!id.hasOwnProperty("type")) throw "id of set! must be an identifier";
    if (!body.hasOwnProperty("type")) throw "body of set! must be an AST";
    return {type : "set!", id : id, body : body};
}

function if_(test, tr, fa) {
    if (!test.hasOwnProperty("type")) throw "test of if must be an AST";
    if (!tr.hasOwnProperty("type")) throw "tr of if must be an AST";
    if (!fa.hasOwnProperty("type")) throw "fa of if must be an AST";
    return {type : "if", test : test, tr : tr, fa : fa};
}

function cond(cases) {
    if (!(cases instanceof Array)) throw "cases of cond must be an Array";
    return {type : "cond", cases : cases};
}

function let_(bindings, body) {
    if (!(bindings instanceof Array)) throw "bindings of let must be an Array";
    if (!body.hasOwnProperty("type")) throw "body of let must be an AST";
    return {type : "let", bindings : bindings, body : body};
}

function or(params) {
    if (!(params instanceof Array)) throw "params of or must be an Array";
    
    return {type : "or", params : params};
}

function and(params) {
    if (!(params instanceof Array)) throw "params of and must be an Array";
    return {type : "and", params : params};
}

function begin(list) {
    if (!(list instanceof Array)) throw "list of begin must be an Array";
    return {type : "begin", list : list};
}


module.exports.boolliteral = boolliteral;
module.exports.intliteral = intliteral;
module.exports.ident = ident;
module.exports.lambda = lambda;
module.exports.apply = apply;
module.exports.define = define;
module.exports.setbang = setbang;
module.exports.if_ = if_;
module.exports.cond = cond;
module.exports.or = or;
module.exports.and = and;
module.exports.begin = begin;
module.exports.let_ = let_;
