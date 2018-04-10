function tokenize(code) {
    return code.match((/[()\[\]]|-?[1-9][0-9]*|0|[^ \r\n\t()\[\]]+|"([^"]*(\\["])*)*"|#[tf]|'|("(\\.|[^\\"])*")|(;[^\n]*)/g)).map(x => {
        if (x === "[") return "(";
        if (x === "]") return ")";
        return x;
    });
}

exports.tokenize = tokenize;