const fs = require("fs");
const fold_begin = require("./lib/Folding").fold_begin;
const get_free_variable = require("./lib/Tanslator").get_free_variable;
const translate = require("./lib/Tanslator").translate;
const cps_transform = require("./lib/CPS-convertor").cps_transform;
const curry = require("./lib/Curry").curry;
const parse = require("./lib/Parser").parse;
const fold_application = require("./lib/Folding").fold_application;
const desugar = require("./lib/Desugar").desugar;
const ast_pretty_print = require("./lib/PrettyPrint").ast_pretty_print;
let program = require("commander");

program
    .version("0.0.1")
    .option("-c, --cps", "generate cps-converted scheme code")
    .option("-k, --kurry", "curry the code")
    .action(function (file_name) {
        if (file_name === undefined) {
            console.error("Please input scheme file name");
            return;
        }
        let code = fs.readFileSync(file_name).toString();
        if (program.cps) {
            fs.writeFileSync(file_name.split("\\").reverse()[0].split(".")[0] + "-cps.scm", work(code, true));
        }
        else {
            fs.writeFileSync(file_name.split("\\").reverse()[0].split(".")[0] + ".c", work(code));
        }
    });

program.parse(process.argv);

function work(code, cps_flag = false, curried_flag = false, flat_flag = false, check_unbound_flag = true, fold_flag = true) {
    try {
        let ast = parse(code);
        let desugared_ast = desugar(ast);
        let curried_ast = curried_flag ? curry(desugared_ast) : desugared_ast;
        let cps_transformed_ast = cps_transform(curried_ast);
        let top_bindings = {};
        let folded_ast = fold_flag ? fold_application(top_bindings, cps_transformed_ast, 100) : cps_transformed_ast;
        let result_ast = flat_flag ? fold_begin(folded_ast) : folded_ast;

        if (cps_flag) {
            return ast_pretty_print(result_ast);
        }

        let check_unbound = get_free_variable({}, result_ast);
        if (check_unbound_flag && JSON.stringify(check_unbound) !== '{}') {
            let unsolved_references = [];
            for (let st in check_unbound) {
                unsolved_references.push(st);
            }
            console.error("Unsolved References : " + unsolved_references.toString());
        }

        return translate(result_ast);//translate(result_ast);
    } catch (exp) {
        console.error("Excetpion : " + exp);
    }
}

// cps_tests.map(x => console.log(work(x)));