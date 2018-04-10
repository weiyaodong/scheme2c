# scheme2c

A scheme to C compiler written in node.js 

#### How to use ?

You need `node` on your computer. Enter the directory of the project and use the following command to compile your scheme file to C or just compile it to continuation-passing-style.

- Compile scheme to C 

```bash
node index.js your-scheme-file-name.scm <option>
```

- Compile scheme to CPS

```bash
node index.js your-scheme-file-name.scm -c <option>
```

You can add `-k` after the commands to curry the code.

