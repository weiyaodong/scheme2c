# 一个简单的 Scheme 到 C 的编译器

这是一个用 JavaScript 实现的简单的编译器，能够将 scheme 的一个子集编译到可以阅读的 C 语言，其教学意义远大于实际意义。

##### 为什么用 JavaScript

懒

##### 前面的废话

从接触函数式语言（这里更准确的来说是指支持 first-class-function 的语言）开始，我就一直在思考这个问题：这些高级的抽象是如何转换到相对低级的抽象直至汇编的。在刚开始学习编程时使用的是 C 语言。C 语言的优点和缺点都在于它足够底层，C 语言和汇编的关系是明显的，是基本可以直接看出来的。但在后来接触的其它语言基本都支持更高等级的抽象，而这些抽象中最常见的一种就是 first class function。C++11 作为一个划时代的 C++ 版本，提供的诸多重要特性中的一条就是 lambda 表达式。C++ 和很多其它语言对于 lambda 的实现都是将其处理成一个匿名类，将捕获的变量作为匿名类的成员、表达式的 body 存放在匿名类的一个方法中。但我们这里不是要实现一个 C++ 到 C 的编译器，所以我们会采用其它的方法。这里我们假定读者对 scheme 的语法有一定的了解， 所以不会再对 Scheme 语言本身做太详细的介绍。

下面是正文

---

## 整体思路

这里我们将会支持 Scheme 语言的一个子集，支持如下关键字/函数 ：

```scheme
keywords : if, set!, lambda, begin, cond, else, let, and, or, define，call/cc
functions : display, newline, read, +, -, *, /, =, <, >  
```

（注：为了方便，这里的 `+` , `-` , `*` , `/` 均是二元运算符）

（注2：没有字符串，`car` , `cdr` , `quote` ) 

（注2：没有实现宏）



Scheme 编译到 C 可以有很多方法，这里我们提供的是一种方案。



0.  解析生成抽象语法树

Scheme 的 parse 没有什么好说的。

1.  去糖

Scheme 本身提供了很多语法糖，我们可以将它们去掉来减少需要翻译的关键字数量。

2.  *柯里化

可以在编译的途中顺便进行柯里化（可选）

3.  CPS 变换

利用 CPS 变换把所有函数调用改成尾调用，降低函数结构复杂度。

4.  *简单的 beta 规约和其他简化

消除掉可能存在的冗余结构（可选）

5.  检查变量绑定

防止出现全局自由变量，在编译过程中进行检查

6.  闭包转化

消除 lambda 中的自由变量，使 lambda 的调用不依赖于词法作用域

7.  生成 C 代码

按照规则将抽象语法树翻译成 C 代码

## 0. 解析

首先是 Tokenizer，直接使用 js 的正则

```javascript
function tokenize(code) {
    return code.match((/[()\[\]]|-?[1-9][0-9]*|0|[^ \r\n\t()\[\]]+|"([^"]*(\\["])*)*"|#[tf]|'|("(\\.|[^\\"])*")|(;[^\n]*)/g)).map(x => {
        if (x === "[") return "(";
        if (x === "]") return ")";
        return x;
    });
}
```

然后顺便把括号形式统一一下。

S Expression 本身的形式非常适合转化为（或者说就是）抽象语法树，~~为了方便~~我们这里使用 js 原生的对象来表示，并使用 `type` 域来表示 AST 的类型，比如下面的构造函数：

```javascript
function lambda(params, body){
    return {type : "lambda", params : params, body : body};
}
```

在解析的同时我们会去掉一部分的语法糖，比如下面的函数定义：

```scheme
(define (id x) x)
```

会被转化为

```scheme
(define id 
  (lambda (x) x))
```

包含多个表达式的 lambda 的 body，会用 `begin` 来包裹

```scheme
(define gen 
  (lambda (x)
    (define y (+ x 1))
    (display y)))
```

会成为：

```scheme
(define gen 
  (lambda (x)
    (begin
     (define y (+ x 1))
     (display y))))
```

而在 if 中如果没有给出错误的分支，则直接返回这里的 unit 也就是逻辑否 `#f`

解析的内容需要讲的大概就这么多，下面对 AST 的操作才是这篇文章的重点。

## 1. 去糖

在解析的同时我们已经去掉了一部分语法糖，这里我们将处理剩下的。

### 1.0 对代码进行包裹

因为代码的最外层是一长串定义和函数调用，所以我们这里用 `begin` 把它们包起来。

### 1.1 `let` 的消去

因为我们并没有打算把代码编译成 ANF 形式，所以这里我们会用 lambda 表达式和 函数应用来代替 `let` 。

`let` 本身的功能是在作用域中引入一个新的值，通过 `lambda` 我们能做同样的事情。下面是一段使用了 `let` 的代码

```scheme
(define (y f)
  (let ((u (lambda (x) (x x))))
    (u (lambda (g) (f (lambda (x) ((g g) x)))))))
```

可以转化为 

```scheme
(define (y f)
  ((lambda (u)
    (u (lambda (g) (f (lambda (x) ((g g) x)))))) 
   (lambda (x) (x x))))
```

### 1.2 `cond` 的消去

`cond` 可以转化为多个 `if` 的串联，而 `else` 出现的地方就是这一条 `if` 串的结束。

```scheme
(define (one-or-two n)
  (cond ((= n 1) (display 1))
        ((= n 2) (display 2))
        (else (display #f))))
```

这段代码可以转化为

```scheme
(define (one-or-two n)
  (if (= n 1) (display 1)
        (if (= n 2) (display 2)
        (display #f))))
```

### 1.3 `and` ，`or` 的消去

`and` 和 `or` 都可以转化为 `if` 的串联，这里不再给出例子。



## 2. *柯里化

柯里化是一个可选的变换，它会把所有函数转化为单个参数的函数，并将多个参数的调用转化为单个参数的调用。

具体的操作没有很特殊的地方，只需要把 `lambda` 的参数一个一个提出来并做成一个嵌套的 `lambda` 即可。

```scheme
(define add2 (lambda a b) (+ a b)))
(display (add2 1 2))
```

经过柯里化后会变成

```scheme
(define add2 (lambda (a) (lambda (b) (+ a b))))
(display ((add2 1) 2))
```



## 3. CPS 变换

在之前的文章中我们提到了 CPS 变换的原理和意义并实现了 lambda calculi 的 cps 变换。这里我们将会对一个更加丰富的语言进行 CPS 变换

对于转化后的 scheme，我们只需要对下面几种 AST 进行变换

-   lambda 表达式
-   函数应用 
-   变量定义/修改(`define`)
-   条件语句(`if`)
-   顺序执行(`begin`)
-   特殊的函数 : `call/cc`
-   字面量/标识符

在 CPS 变换的时候我们会维护当前延续 `cont` 用以接收正在转换的 AST。

### 3.1 字面量/标识符

将值传给 `cont` 即可

### 3.2 `call/cc`

在之前的文章中提到， `call/cc` 在 CPS 中会变换为一个普通的函数，这里只做简单的解释。考虑 CPS 的意义和 `call/cc` 的作用。 `call/cc` 是一个单参函数，在 CPS 后会得到两个参数，其中第二个参数是 current-continuation `c1`；作为第一个参数的函数 `f` 原本只有一个参数，用来接收来自 `call/cc` 的 current-continuation，经过 CPS 后得到第二个参数作为自己的 current-continuation。因为 `call/cc` 会把 `f` 应用到 current-continuation 上，而原本喂给 `f` 的 continuation 相当于“接受一个参数并回到 `call/cc` 所在的位置”的函数，所以这里应用给 `f` 的 continuation 会因为 CPS 变换得到第二个参数 `c2`、也就是在 `call/cc` 调用过程中丢失的 continuation；而喂给 `f` 的 current-continuation 的 body 就是把 `call/cc` 的 current-continuation `c1` 应用到 `f` 接受的 continuation 所捕获的值 `x`。

```javascript
let callcc = lambda([f, c1], 
                    apply(ident(f), 
                          [lambda([x, c2],
        apply(ident(c1), [ident(x)])), ident(c1)]));
```

然后把转换后的函数喂给 `cont` 。

### 3.3 变量定义/修改

根据 CPS 的思想，变量的值的修改/定义在转换时我们需要先得到它被定义的值，然后在后文中用 lambda 拿到它再进行修改/定义。而 CPS 本身需要拿到一个值传给 `cont` ，所以我们用一个 `begin` 把它包起来，并在最后返回一个 unit 也就是 `#f` 

```javascript
return cps_transform(
  ast.body, 
  lambda([c2],
      begin([define(ast.id, ident(c2)),
         apply(cont, [boolliteral(false)])])));
```

### 3.4 条件语句

`if` 是去糖后唯一的分支语句。根据 CPS 的原则，我们需要先得到 `if` 作为判断条件的值，然后分别将 `cont` 传给后面的两个分支。

```javascript
return cps_transform(
  ast.test, 
  lambda([testc], 
         _if(ident(testc),
             cps_transform(ast.tr, cont),
             cps_transform(ast.fa, cont))));
```

### 3.5 lambda 表达式

`lambda` 的变换也是非常平凡的。首先添加上新的参数作为新的 `cont` ，然后把函数的 body 改写为 CPS ，最后将转换后的函数返回给原本的 `cont` 。

### 3.6 函数应用

对于函数应用中的每一个参数，我们都需要创造一个新的 continuation 。然后通过嵌套的多层函数应用的最后，把 CPS 后的应用函数应用到这些参数和 `cont` 上。

需要注意的是我们没有实现预定义函数的 CPS 版本，所以在这里没有对预定义函数进行 CPS 变换。

```javascript
let vars = [];
for (let x of ast.params) {
  vars.push(gensym());
}
let g = gensym();
let cur;
if (ast.fun.type === "ident" && primitives.includes(ast.fun.name)) {
  cur = apply(cont, [apply(ast.fun, vars.map(ident))]);
} else {
  cur = cps_transform(ast.fun, 
                      lambda([g],
                             apply(ident(g),
                                   [...(vars.map(ident)), cont])));
}
for (let i = 0; i < ast.params.length; i++) {
  cur = cps_transform(ast.params[i], 
                      lambda([vars[i]],
                             cur));
}
return cur;
```

## 4. *AST 的简化

因为直接用上述方法生成的 CPS 代码中会有大量的简单函数调用，所以我们可以对部分的函数调用直接进行折叠。当函数应用的参数是字面量或者是标识符时，我们可以直接将函数应用展开。同时我们可以把只有一个表达式的 `begin` 进行简化，以及消除 id 函数应用。

这一步是可选的，但可以显著提升生成代码的可读性。



## 5. 检查变量绑定

为了后面的闭包转化，以及整个程序的语法分析，检查全局作用域下出现的自由变量，我们需要针对每个 AST 检查变量绑定。

在检查绑定时会传入一个环境，其中会保存当前 AST 能访问到的所有变量。在对 lambda 的 body 进行检查时，会建立一个当前环境的拷贝，并在其中添加上 lambda 的参数。这里直接使用了 js 的 `Object` 和原型链来保存作用域变量。

关于 AST 的操作到这里就结束了，下面是代码生成部分。

---

## 生成的 C 语言模板

经过 CPS 变换的代码所有的函数调用都是尾调用。如果把所有 lambda 的 body 都串成一串的话，那么函数调用就是在这些地方进行跳转，但因为跳转的地方并不是固定的（存在条件分支语句等），所以在 C 语言不开启扩展的情况下无法使用 `goto` 来实现。

因为是个玩具编译器，我们这里不考虑内存泄漏（当然直接套上一个 gc 库就行了）。

在生成的代码中，**值**一共有三种类型，数字/逻辑/函数（当然添加新的原生类型也是很容易的事情）。我们使用类似 tagged union 的东西来保存他们

```c
typedef enum _ObjectType {
    BOOL,
    INTEGER,
    FUN
} ObjectType;

typedef struct _Object {
    ObjectType type;
} Object;

typedef struct _Integer {
    Object obj;
    int value;
} Integer;

typedef struct _Boolean {
    Object obj;
    bool value;
} Boolean;
```

那么我们该如何保存函数呢？

函数在 CPS 中是 jump with parameters，所以需要相应的函数指针

因为函数在应用时需要绑定它的参数，所以函数需要保存参数列表

而因为函数中存在自由变量，经过闭包转化后需要保存这些变量的闭包

那么我们可以给出函数的定义

```c
typedef struct _ParamNode {
    struct _ParamNode* next;
    String value;
} ParamNode;

typedef struct _ParamList {
    ParamNode* head;
} ParamList;

typedef struct _LinkedListNode {
    struct _LinkedListNode* next;
    String key;
    Object* value;
} LinkedListNode;

typedef struct _Closure{
    LinkedListNode* bindings;
    struct _Closure* parent;
} Closure;

typedef struct _Function {
    Object obj;
    ParamList parameters;
    Object* (*fun)(Closure*);
    Closure* scope;
} Function;

```

这里直接使用链表来保存闭包中的元素和参数列表，条件允许应该使用更加高效的数据结构。



## 6. 闭包转化 

在消除函数中的自由变量的方法中不得不提到的两种方法分别是闭包转化和 lambda 提升。闭包转化将函数中绑定的自由变量提到一个闭包中，并在所有函数中添加一个新参数用来传递这个闭包，从而使 lambda 的调用不会依赖于使用的环境；而 lambda 提升则是把所有自由变量作为新的参数添加到 lambda 中，直至所有函数都没有自由变量，就能将 lambda 提升到全局作用域。然而 lambda 提升在处理函数本身作为返回值时会变得非常复杂。这里我们在代码生成的同时进行闭包转化。

首先要做的事情是把 AST 中所有的 lambda 找出来并进行编号，塞到一个函数表中。然后逐一对它们进行翻译。在上面讲翻译后的函数的结构时提到，我们需要保存函数的参数名字列表，这是因为我们需要调用者来为调用的函数进行参数的绑定，而参数的绑定会在 `Closure` 中进行保存。

考虑翻译下面的 lambda （body 中的 lambda 将直接以其编号代替）

```scheme
(lambda (c0)
 (c12 c0
      lambda2))
```

在这个 lambda 里包含了自由变量 `c12` ，所以需要从调用函数时的 closure 中找出名为 `c12` 的变量；而作为函数的参数的 `c0` 的值，在调用这个函数之前会由调用方在 closure 中进行绑定， 所以这里也需要在生成的代码中找出 `c0` 的值。

这个 lambda 的 body 非常简单，是一个函数调用。其中调用的第二个参数是一个 lambda 。lambda 在参与运算时会获取当前作用域中的绑定，所以这里我们可以直接把当前 closure 作为 `lambda2` 的 closure。函数在调用时会由当前的 closure 派生出一个新的 closure ，然后根据 `c12` 的参数列表分别将 `c0` 和构造好的 `lambda2` 塞进这个新的 closure，最后跳转到 `c12` 的 body 处，也就是返回 `c12` 的函数调用结果。按照这个逻辑生成的 C 代码是 ：

```C
/*
(lambda (c0)
 (c12 c0
      lambda2))
*/
Object *lambda1_body(Closure* closure) {
    Object* c0 = lookup_from_closure("c0", closure); // 函数的参数的绑定
    Object* c12 = lookup_from_closure("c12", closure); // 自由变量的绑定
    Closure* new_closure = derive_closure(((Function*)c12)->scope); // 函数调用时建立的新 closure
    ParamNode* cur = ((Function*)c12)->parameters.head; // 装载函数调用参数
    push(new_closure, cur->value, c0);cur = cur->next;
    push(new_closure, cur->value, create_function(lambda2_body, lambda2_param, closure));
    // 使用 create_function 来创造一个新的函数对象
    return ((Function*)c12)->fun(new_closure);
}
```

## 7. 生成 C 代码

上面的一节讲了在生成代码的同时进行的闭包转化，这一节会对整个翻译过程进行更加详细的说明。

首先是生成的整个 C 语言文件的结构，一共分成 4 个部分。

- 预定义的函数和类型
- 顶层函数的 body 声明和参数列表初始化
- 所有 lambda 的 body 实现
- main 函数

预定义的部分包括所有的内置函数，包括 `display` , `newline` , `read` , `+` , `-` , `*` , `/` , `=` , `>` , `<` ；以及各种类型的对象的构造函数和其它与函数应用有关的函数。

这里给出它们的声明和部分函数的定义：

```C
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define assert(x, MSG) {    if (!(x)) { fprintf(stderr, #MSG); exit(1); }}

typedef enum _ObjectType {
    BOOL,
    INTEGER,
    FUN
} ObjectType;

typedef struct _Object Object;
typedef struct _Integer Integer;
typedef struct _Boolean  Boolean;
typedef char* String;
typedef struct _ParamNode ParamNode;
typedef struct _ParamList ParamList;
typedef struct _LinkedListNode LinkedListNode;
typedef struct _Closure Closure;
typedef struct _Function Function;

Object* create_integer(int x) {
    Integer* temp = (Integer*)malloc(sizeof(Integer));
    temp->obj = (Object){INTEGER};
    temp->value = x;
    return (Object*)temp;
}

Object* create_boolean(bool x) {
    Boolean* temp = (Boolean*)malloc(sizeof(Integer));
    temp->value = x;
    temp->obj = (Object){BOOL};
    return (Object*)temp;
}

Closure* global_closure;

ParamList push_parameter(ParamList list, String value) {
    ParamNode* cur = (ParamNode*)malloc(sizeof(ParamNode));
    cur->value = value;
    cur->next = list.head;
    list.head = cur;
    return list;
}

void push(Closure* closure, String str, Object* obj) {
    LinkedListNode* node = (LinkedListNode*)malloc(sizeof(LinkedListNode));
    node->next = closure->bindings;
    node->key = str;
    node->value = obj;
    closure->bindings = node;
}

Closure* derive_closure(Closure* parent) {
    Closure* closure = (Closure*)malloc(sizeof(Closure));
    closure->bindings = NULL;
    closure->parent = parent;
    return closure;
}

Object* create_function(Object* (*fun)(Closure*), ParamList list, Closure* scope) {
    Function* function = (Function*)malloc(sizeof(Function));
    function->fun = fun;
    function->parameters = list;
    function->scope = scope;
    function->obj = (Object){FUN};
    return (Object *) function;
}

Object* lookup_from_closure(String name, Closure* closure) {
    while (closure != NULL) {
        LinkedListNode *cur = closure->bindings;
        while (cur != NULL) {
            if (strcmp(name, cur->key) == 0) {
                return cur->value;
            }
            cur = cur->next;
        }
        closure = closure->parent;
    }
    return NULL;
}

Object* builtin_display(Object *a) {
    Object* object = create_boolean(false);
    if (a->type == INTEGER) {
        printf("%d", ((Integer *) a)->value);
    } else if (a->type == BOOL) {
        printf("#%c", ((Boolean*) a)->value ? 't' : 'f');
    } else {
        printf("<procedure>");
    }
    return object;
}

Object* builtin_newline();

Object* builtin_read() {
    char c = getchar();
    if (c == '#') {
        c = getchar();
        return create_boolean((c == 't' || c == 'T'));
    }
    ungetc(c, stdin);
    int temp; scanf("%d", &temp);
    return create_integer(temp);
}

Object* builtin_add(Object* a, Object* b) {
    assert(a->type == b->type && a->type == INTEGER, parameters of add must be integer);
    Integer* int_a = (Integer*)a;
    Integer* int_b = (Integer*)b;
    return create_integer(int_a->value + int_b->value);
}

Object* builtin_sub(Object* a, Object* b);
Object* builtin_mult(Object* a, Object* b);
Object* builtin_div(Object* a, Object* b);
Object* builtin_eq(Object* a, Object* b);
Object* builtin_less(Object* a, Object* b);
Object* builtin_greater(Object* a, Object* b);
```

接下来需要给出所有 lambda body 的声明，并对 lambda 的参数列表进行初始化

```c
ParamList lambda0_param;
ParamList lambda1_param;
...
ParamList lambda12_param;

Object* lambda0_body(Closure*);
Object* lambda1_body(Closure*);
...
Object* lambda12_body(Closure*);
```

因为插入是插在链表的头部，所以要将所有参数的顺序反过来插入：

```c
void lambda_initialization() {
    // the list of global lambdas
    lambda0_param.head = NULL;
    lambda0_param = push_parameter(lambda0_param, "c3");

    lambda1_param.head = NULL;
    lambda1_param = push_parameter(lambda1_param, "c0");

    lambda2_param.head = NULL;
    lambda2_param = push_parameter(lambda2_param, "c4");
    lambda2_param = push_parameter(lambda2_param, "n");

	...
    
    lambda12_param.head = NULL;
    lambda12_param = push_parameter(lambda12_param, "c16");
}
```

然后是所有 lambda body 的实现。考虑所有的 AST 种类

- 字面量/标识符
- 分支结构 `if`
- 变量定义/修改 `define`
- lambda 表达式
- 函数应用
- 顺序执行

对于不同种类的字面量，在翻译时需要调用不同的字面量构造函数；标识符的话，在函数开始时会进行绑定，所以直接返回标识符的名字就可以了。

```javascript
case "boollit":
	return "create_boolean(" + ast.value + ")";
case "intlit":
	return "create_integer(" + ast.value + ")";
case "ident":
	return ast.name;
```

`define` 相当于在当前的作用域中引入新的绑定，所以直接在 `closure` 中插入一条新的 record 即可。

```javascript
case "define":	
	return "push(closure, \"" + ast.id.name + "\"," + rec_translate(ast.body, level) +");";
```

对于 `if` , 因为在 CPS 之后我们可以保证 `if` 的 `test` 肯定是一个字面量或者标识符，所以直接在 `if` 的括号中塞进 `test` 作为 `Boolean` 的值就行。

```javascript
case "if":
	res += "if (((Boolean*)" + rec_translate(ast.test, level) + ")->value) {\n" + spaces(level * 4);
	res += rec_translate(ast.tr, level + 1);
	res += "\n" + spaces(level * 4) + "} else {\n" + spaces(level * 4); 
	res += rec_translate(ast.fa, level + 1);
	res += "\n" + spaces(level * 4) + "}\n";
    return res;
```

`begin` 的话直接一句一句翻译就行：

```javascript
case "begin":
    for (let i = 0; i < ast.list.length; i++) {
        if (i == ast.list.length - 1 && (ast.list[i].type === "boollit" || ast.list[i].type === "intlit" || ast.list[i].type === "ident" || (ast.list[i].type === "apply" && primitives.includes(ast.list[i].fun.name)))) {
            res += "return ";
            res += rec_translate(ast.list[i], level) + ";\n";
        }
        else 
            res += rec_translate(ast.list[i], level) + "\n" + spaces(level * 4);
    }
    return res;
```

需要注意的是如果最后一句是字面量或者内置函数应用的话，需要直接返回那个值。

`lambda` 的翻译在之前也说过，需要根据当前的 `closure` 创建一个新的 `Function` 

```javascript
case "lambda": 
	return "create_function(lambda" + ast.label + "_body, lambda" + ast.label + "_param, closure)";
```

最麻烦的就是函数应用的翻译，如果其中的函数是 lambda 表达式，那么创建的新 closure 是从当前 closure 上派生的，而函数的参数列表要从全局定义的 lambda 参数列表中进行寻找，并在最后直接调用相应的 lambda_body 。而如果函数是从 closure 中找到的对象，那么创建的新 closure 则是从函数对象本身的 closure 上派生的，而且相应的参数列表和最后调用的函数都是从这个对象里获取的；而如果这个函数是内置函数的话，因为没有进行过 CPS 转化，所以函数调用不是尾调用，直接翻译成相应的内置函数调用即可：

```javascript
case "apply":
if (ast.fun.type === "ident") {
    //["display", "newline", "+", "-", "*", "/", "read", "=", "<", ">"];
    if (primitives.includes(ast.fun.name)) {
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
    res += "ParamNode* cur = ((Function*)" + ast.fun.name + ")->parameters.head;"
    res += "\n" + spaces(4 * level);
    res += "// load parameters \n" + spaces(4 * level);
    for (let i = 0; i < ast.params.length; i++) {
        res += "push(new_closure, cur->value, " + rec_translate(ast.params[i]) + ");"
        if (i != ast.params.length - 1) {
            res += "cur = cur->next;";
        }
        res += "\n" + spaces(4 * level);
    }
    res += "return ((Function*)" + ast.fun.name + ")->fun(new_closure);";
    return res;
} else if (ast.fun.type === "lambda") {
    let name = "lambda" + ast.fun.label;
    res += "Closure* new_closure = derive_closure(closure);\n" + spaces(4 * level);
    res += "ParamNode* cur = " + name + "_param.head;"
    res += "\n" + spaces(4 * level);
    res += "// load parameters\n" + spaces(4 * level);
    for (let i = 0; i < ast.params.length; i++) {
        res += "push(new_closure, cur->value, " + rec_translate(ast.params[i]) + ");"
        if (i != ast.params.length - 1) {
            res += "cur = cur->next;";
        }
        res += "\n" + spaces(4 * level);
    }
    res += "return " + name + "_body(new_closure);";
    return res;
}
```

然后是最后的 main 函数。因为去糖和 CPS 变换的原因，最外层一般是 `begin` 或者函数调用，所以直接用之前的方法翻译一次即可。然后为所有 closure 定义一个公共的祖先也就是 `global_closure` ，并当作初始的 closure 传入最外层的 AST 。

```C
Object* main_body() { // This is an example : 
    Closure* closure = global_closure;
    Closure* new_closure = derive_closure(closure);
    ParamNode* cur = lambda0_param.head;
    // load parameters
    push(new_closure, cur->value, create_function(lambda2_body, lambda2_param, closure));
    return lambda0_body(new_closure);
}

int main() {
    global_closure = (Closure*)malloc(sizeof(Closure));
    global_closure->bindings = NULL;
    lambda_initialization();

    main_body();

    return 0;
}
```

## 可能存在的改进措施

- 事实上函数参数中的 closure 是可以去掉的，因为所有的调用都是尾调用，直接更改全局的 closure 即可。
- 支持列表，`quote` ，二元组，字符串等
- 支持简单的宏
- 减少过程中的冗余措施，加快编译速度
- 不为没有被引用的函数参数添加绑定
- 编译到更底层的语言如其它 IR 或者汇编。

## 后记

代码会在经过整理和修改后一同上传。

写完这个参考了很多重要的资料，它们分别是

Andrew W.Appel 的 Compiling with Continuations,

 [Christian Queinnec](https://en.wikipedia.org/w/index.php?title=Christian_Queinnec&action=edit&redlink=1) 的 [Lisp in Small Pieces](https://en.wikipedia.org/wiki/Lisp_in_Small_Pieces) 

Matt.Might 的[博客](http://matt.might.net/)给了我很大的帮助，尤其是下面几篇文章

[Closure conversion: How to compile lambda](http://matt.might.net/articles/closure-conversion/) 

[How to compile with continuations](http://matt.might.net/articles/cps-conversion/)