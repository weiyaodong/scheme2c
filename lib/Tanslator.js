const is_primitive = require("./Constant").is_primitive;
const ast_pretty_print = require("./PrettyPrint").ast_pretty_print;

let lambda_counter = 0;
let lambda_table = [];

function label_init() {
    lambda_counter = 0;
    lambda_table = [];
}

function spaces(num) {
    return " ".repeat(num);
}

function get_free_variable(env, ast) {
    switch(ast.type) {
        case "boollit" :
        case "intlit" :
            return {};
        case "ident" :
            if ((ast.name in env) || (is_primitive(ast.name))) {
                return {};
            }
            let res = {};
            res[ast.name] = ast.name;
            return res;
        case "if" :
            let a = get_free_variable(env, ast.test);
            let b = get_free_variable(env, ast.tr);
            let c = get_free_variable(env, ast.fa);
            for (let x in b) {
                a[x] = x;
            }
            for (let x in c) {
                a[x] = x;
            }
            return a;
        case "define" :
        case "set!" :
            let cur_env = {};
            cur_env[ast.id] = ast.id;
            cur_env.__proto__ = env;
            return get_free_variable(cur_env, ast.body);
        case "begin" :
            let res2 = {};
            res2.__proto__ = env;
            for (let i = 0; i < ast.list.length; i++) {
                let temp1 = get_free_variable(res2, ast.list[i]);
                let temp2 = {};
                for (let x in temp1) {
                    temp2[x] = x;
                }
                temp2.__proto__ = res2;
                res2 = temp2;
            }
            return res2;
        case "lambda" :
            let cure = {};
            cure.__proto__ = env;
            for (let i = 0; i < ast.params.length; i++) {
                cure[ast.params[i]] = ast.params[i];
            }
            return get_free_variable(cure, ast.body);
        case "apply" :
            let r1 = get_free_variable(env, ast.fun);
            for (let i = 0; i < ast.params.length; i++) {
                let temp1 = get_free_variable(env, ast.params[i]);
                let temp2 = {};
                for (let x in temp1) {
                    temp2[x] = x;
                }
                temp2.__proto__ = r1;
                r1 = temp2;
            }
            return r1;
        default :
            throw "What the fuck ??????";
    }
}

function lambda_label(ast) {
    switch(ast.type) {
        case "boollit":
        case "intlit":
        case "ident":
            return;
        case "define":
            return lambda_label(ast.body);
        case "begin":
            for (let i = 0; i < ast.list.length; i++) {
                lambda_label(ast.list[i]);
            }
            return;
        case "if":
            lambda_label(ast.test);
            lambda_label(ast.tr);
            lambda_label(ast.fa);
            return;
        case "lambda":
            ast.label = lambda_counter++;
            lambda_table.push(ast);
            lambda_label(ast.body);
            return;
        case "apply":
            lambda_label(ast.fun);
            for (let i = 0; i < ast.params.length; i++) {
                lambda_label(ast.params[i]);
            }
            return;
    }
}

function rec_translate(ast, level = 0) {
    let res = "";
    // noinspection FallThroughInSwitchStatementJS
    switch(ast.type) {
        case "boollit":
            return "create_boolean(" + ast.value + ")";
        case "intlit":
            return "create_integer(" + ast.value + ")";
        case "ident":
            return ast.name;
        case "define":
            return "push(closure, \"" + ast.id.name + "\"," + rec_translate(ast.body, level) +");";
        case "begin":
            for (let i = 0; i < ast.list.length; i++) {
                if (i === ast.list.length - 1 && (ast.list[i].type === "boollit" || ast.list[i].type === "intlit" || ast.list[i].type === "ident"
                        || (ast.list[i].type === "apply" && is_primitive(ast.list[i].fun.name)))) {
                    res += "return ";
                    res += rec_translate(ast.list[i], level) + ";\n";
                }
                else
                    res += rec_translate(ast.list[i], level) + "\n" + spaces(level * 4);
            }
            return res;
        case "lambda":
            return "create_function(lambda" + ast.label + "_body, lambda" + ast.label + "_param, closure)";
        case "if" :
            res += "if (((Boolean*)" + rec_translate(ast.test, level) + ")->value) {\n" + spaces(level * 4);
            res += rec_translate(ast.tr, level + 1);
            res += "\n" + spaces(level * 4) + "} else {\n" + spaces(level * 4);
            res += rec_translate(ast.fa, level + 1);
            res += "\n" + spaces(level * 4) + "}\n";
            return res;
        case "apply":
            if (ast.fun.type === "ident") {
                //["display", "newline", "+", "-", "*", "/", "read", "=", "<", ">"];
                if (is_primitive(ast.fun.name)) {
                    switch(ast.fun.name) {
                        case "display" :
                            return "builtin_display(" + rec_translate(ast.params[0]) + ")";
                        case "newline" :
                            return "builtin_newline()";
                        case '+' :
                            return "builtin_add(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case '-' :
                            return "builtin_sub(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case '*' :
                            return "builtin_mult(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case '/' :
                            return "builtin_div(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case '>' :
                            return "builtin_greater(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case '<' :
                            return "builtin_less(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case '=' :
                            return "builtin_eq(" + rec_translate(ast.params[0]) + ", " + rec_translate(ast.params[1]) + ")";
                        case 'read' :
                            return "builtin_read()";
                        default :
                        // TODO
                    }
                }
                res += "Closure* new_closure = derive_closure(((Function*)" + ast.fun.name + ")->scope);\n" + spaces(4 * level);
                res += "ParamNode* cur = ((Function*)" + ast.fun.name + ")->parameters.head;";
                res += "\n" + spaces(4 * level);
                res += "// load parameters \n" + spaces(4 * level);
                for (let i = 0; i < ast.params.length; i++) {
                    res += "push(new_closure, cur->value, " + rec_translate(ast.params[i]) + ");";
                    if (i !== ast.params.length - 1) {
                        res += "cur = cur->next;";
                    }
                    res += "\n" + spaces(4 * level);
                }
                res += "return ((Function*)" + ast.fun.name + ")->fun(new_closure);";
                return res;
            } else if (ast.fun.type === "lambda") {
                let name = "lambda" + ast.fun.label;
                res += "Closure* new_closure = derive_closure(closure);\n" + spaces(4 * level);
                res += "ParamNode* cur = " + name + "_param.head;";
                res += "\n" + spaces(4 * level);
                res += "// load parameters\n" + spaces(4 * level);
                for (let i = 0; i < ast.params.length; i++) {
                    res += "push(new_closure, cur->value, " + rec_translate(ast.params[i]) + ");";
                    if (i !== ast.params.length - 1) {
                        res += "cur = cur->next;";
                    }
                    res += "\n" + spaces(4 * level);
                }
                res += "return " + name + "_body(new_closure);";
                return res;
            }
        default:
            throw "What the fuck in code generation : " + ast.type;
    }
}

function _translate(ast) { // this function will translate the final labeled abstract syntax tree to C
    let res = require("./Constant").header + "\n";
    // at first, we should lift the lambdas to the global scope:
    res += "\n";
    for (let i = 0; i < lambda_counter; i++) {
        res += "ParamList lambda" + i + "_param;\n";
    }
    res += "\n";
    for (let i = 0; i < lambda_counter; i++) {
        res += "Object* lambda" + i + "_body(Closure*);\n";
    }
    res += "\n";
    for (let i = 0; i < lambda_counter; i++) {
        res += "/*\n";
        delete lambda_table[i].label;
        res += ast_pretty_print(lambda_table[i]) + "\n*/\n";
        lambda_table[i].label = i;
        res += "Object *lambda" + i +"_body(Closure* closure) {\n" + "    ";
        for (let j = 0; j < lambda_table[i].params.length; j++) {
            res += "Object* " + lambda_table[i].params[j] + " = lookup_from_closure(\"" +
                lambda_table[i].params[j] + "\", closure);\n" + "    ";
        }
        let free_bindings = get_free_variable({}, lambda_table[i]);
        for (let name in free_bindings) {
            if (lambda_table[i].params.includes(name)) continue;
            res += "Object* " + name + " = lookup_from_closure(\"" +
                name + "\", closure);\n    ";
        }
        if (lambda_table[i].body.type === "ident") {
            res += "return " + lambda_table[i].body.name + ";\n    ";
        }
        else if (lambda_table[i].body.type === "apply" && lambda_table[i].body.fun.type === "ident" && is_primitive(lambda_table[i].body.fun.name)) {
            res += "return " + rec_translate(lambda_table[i].body, 1) + ";\n    ";
        } else {
            res += rec_translate(lambda_table[i].body, 1);
        }
        res += "\n}\n\n";
    }
    res += "void lambda_initialization() {\n";
    res += "    // the list of global lambdas \n";
    let fourspc = "    ";
    for (let i = 0; i < lambda_counter; i++) {
        res += fourspc + "lambda" + i + "_param.head = NULL;\n";
        for (let j = lambda_table[i].params.length - 1; j >= 0; j--) {
            res += fourspc + "lambda" + i + "_param = push_parameter(lambda" + i + "_param, \"" + lambda_table[i].params[j] + "\");\n";
        }
        res += "\n";
    }
    res += "}\n\n";
    // generate main body
    res += "Object* main_body() {\n";
    res += "    Closure* closure = global_closure;\n";
    res += "    ";
    if ((ast.type === "apply" && ast.fun.type === "ident" && is_primitive(ast.fun.name)) ||
        (ast.type === "boollit" || ast.type === "intlit" || ast.type === "ident")) {
        res += "return " + rec_translate(ast, 1) + ";";
    } else {
        res += rec_translate(ast, 1);
    }
    res += "\n";
    res += "}\n\n";
    res += require("./Constant").main;
    return res;
}

function translate(ast) {
    label_init();
    lambda_label(ast);
    return _translate(ast);
}

exports.translate = translate;
exports.get_free_variable = get_free_variable;