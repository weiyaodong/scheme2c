function spaces(num) {
    return " ".repeat(num);
}

function ast_print(ast) {
    switch (ast.type) {
        case "boollit" :
            return ast.value ? "#t" : "#f";
        case "intlit" :
            return ast.value.toString();
        case "ident" :
            return ast.name;
        case "define" :
            return "(define " + ast_print(ast.id) + " " + ast_print(ast.body) + ")";
        case "lambda" :
            return "(lambda (" + ast.params.join(" ") + ") " + ast_print(ast.body) + ")";
        case "let" :
            let res = "(let (";
            let temp = [];
            for (let i = 0; i < ast.bindings.length; i++) {
                temp.push("(" + ast_print(ast.bindings[i][0]) + " " + ast_print(ast.bindings[i][1]) + ")");
            }
            res += temp.join(" "); res += ") ";
            res += ast_print(ast.body) + ")";
            return res;
        case "if" :
            return "(if " + ast_print(ast.test) + " " + ast_print(ast.tr) + " " + ast_print(ast.fa) + ")";
        case "or" :
            return "(or " + ast.params.map(x => ast_print(x)).join(" ") + ")";
        case "and" :
            return "(and " + ast.params.map(x => ast_print(x)).join(" ") + ")";
        case "cond" :
            let res2;
            res2 = "(cond ";
            let temp2 = [];
            for (let i = 0; i < ast.cases.length; i++) {
                temp2.push("(" + ast_print(ast.cases[i][0]) + " " + ast_print(ast.cases[i][1]) + ")");
            }
            res2 += temp2.join(" ") + ")";
            return res2;
        case "begin" :
            return "(begin " + ast.list.map(x => ast_print(x)).join(" ") + ")";
        case "set!" :
            return "(set! " + ast.id + " " + ast_print(ast.body) + ")";
        case "apply" :
            return "(" + ast_print(ast.fun) + " " + ast.params.map(x => ast_print(x)).join(" ") + ")";
        default:
            throw "What the fucking type??";
    }
}

function ast_pretty_print(ast, level = 0) {
    let spc = spaces(level + 1);
    switch (ast.type) {
        case "boollit" :
            return ast.value ? "#t" : "#f";
        case "intlit" :
            return ast.value;
        case "ident" :
            return ast.name;
        case "define" :
            return "(define " + ast_print(ast.id) + " \n" +
                spc + ast_pretty_print(ast.body, level + 1) + ")";
        case "lambda" :
            if (ast.hasOwnProperty("label")) { // labeled lambda
                return "lambda" + ast.label;
            }
            return "(lambda (" + ast.params.join(" ") + ") \n" +
                spc + ast_pretty_print(ast.body, level + 1) + ")";
        case "let" :
            let res = "(let (";
            for (let i = 0; i < ast.bindings.length; i++) {
                if (i === 0) {
                    res += "(" + ast_print(ast.bindings[i][0]) + " ";
                    res += ast_pretty_print(ast.bindings[i][1], level + 6) + ")";
                } else {
                    res += "\n" + spaces(level + 6) + "(" ;
                    res += ast_print(ast.bindings[i][0]) + " ";
                    res += ast_pretty_print(ast.bindings[i][1], level + 6) + ")";
                }
            }
            res += ")\n";
            res += spc + ast_pretty_print(ast.body, level + 5) + ")";
            return res;
        case "if" :
            return "(if " + ast_pretty_print(ast.test, level + 4) + " \n" +
                spaces(level + 4) + ast_pretty_print(ast.tr, level + 4) + " \n" +
                spaces(level + 4) + ast_pretty_print(ast.fa, level + 4) + ")";
        case "or" :
            let cur = "(or " + ast_pretty_print(ast.params[0], level + 4);
            for (let i = 1; i < ast.params.length; i++) {
                cur += "\n" + spaces(level + 4);
                cur += ast_pretty_print(ast.params[1], level + 4);
            }
            return cur + ")";
        case "and" :
            let curr = "(and " + ast_pretty_print(ast.params[0], level + 5);
            for (let i = 1; i < ast.params.length; i++) {
                curr += "\n" + spaces(level + 5);
                curr += ast_pretty_print(ast.params[1], level + 5);
            }
            return curr + ")";
        case "cond" :
            let res2 = "(cond ";
            for (let i = 0; i < ast.cases.length; i++) {
                if (i === 0) {
                    res2 += "(" + ast_print(ast.cases[i][0]) + " " + ast_pretty_print(ast.cases[i][1], level + 7) + ")";
                } else {
                    res2 += "\n" + spaces(level + 6) + "(";
                    res2 += ast_print(ast.cases[i][0]) + " " ;
                    res2 += ast_pretty_print(ast.cases[i][1], level + 7) + ")";
                }
            }
            res2 += ")";
            return res2;
        case "begin" :
            return "(begin " + ast.list.map(x => "\n" + spaces(level + 1) + ast_pretty_print(x, level + 1)).join(" ") + ")";
        case "set!" :
            return "(set! " + ast.id.name + " \n" + spaces(level + 1) + ast_pretty_print(ast.body, level + 1) + ")";
        case "apply" :
            let fun = ast_pretty_print(ast.fun, level + 1);
            let len = 0;
            let flag = false;
            for (let i = fun.length - 1; i >= 0 ; i--) {
                if (fun[i] === "\n") {
                    flag = true;
                    break;
                }
                len++
            }
            let res3;
            if (flag) { // the wraped.
                res3 = "(" + fun + " " + ast.params.map(x => ast_pretty_print(x, len + 1)).join("\n" + spaces(len + 1)) + ")";
            } else {
                res3 = "(" + fun + " " + ast.params.map(x => ast_pretty_print(x, level + len + 2)).join("\n" + spaces(level +         len + 2)) + ")";
            }
            return res3;
        default:
            throw "What the fucking type??";
    }
}

exports.ast_pretty_print = ast_pretty_print;
