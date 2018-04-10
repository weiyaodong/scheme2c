const keywords = ["if", "set!", "lambda", "begin", "cond", "else", "let", "letrec", "and", "or", "define"];
const primitives = ["display", "newline", "+", "-", "*", "/", "read", "=", "<", ">"];

function is_keyword(id) {
    return keywords.includes(id);
}

function is_primitive(id) {
    return primitives.includes(id);
}

exports.is_keyword = is_keyword;
exports.is_primitive = is_primitive;

exports.header =
`
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define assert(x, MSG) {\
    if (!(x)) { fprintf(stderr, #MSG); exit(1); }\
}

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

typedef char* String;

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

Object* builtin_newline() {
    Object* object = create_boolean(false);
    puts("");
    return object;
}

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

Object* builtin_sub(Object* a, Object* b) {
    assert(a->type == b->type && a->type == INTEGER, parameters of add must be integer);
    Integer* int_a = (Integer*)a;
    Integer* int_b = (Integer*)b;
    return create_integer(int_a->value - int_b->value);
}

Object* builtin_mult(Object* a, Object* b) {
    assert(a->type == b->type && a->type == INTEGER, parameters of add must be integer);
    Integer* int_a = (Integer*)a;
    Integer* int_b = (Integer*)b;
    return create_integer(int_a->value * int_b->value);
}

Object* builtin_div(Object* a, Object* b) {
    assert(a->type == b->type && a->type == INTEGER, parameters of add must be integer);
    Integer* int_a = (Integer*)a;
    Integer* int_b = (Integer*)b;
    return create_integer(int_a->value / int_b->value);
}

Object* builtin_eq(Object* a, Object* b) {
    if (a->type != b->type) return create_boolean(false);
    if (a->type == INTEGER) {
        return create_boolean(((Integer*)a)->value == ((Integer*)b)->value);
    }
    if (a->type == BOOL) {
        return create_boolean(((Boolean*)a)->value == ((Boolean*)b)->value);
    }
    return create_boolean(false);
}

Object* builtin_less(Object* a, Object* b) {
    if (a->type != b->type) return create_boolean(false);
    if (a->type == INTEGER) {
        return create_boolean(((Integer*)a)->value < ((Integer*)b)->value);
    }
    if (a->type == BOOL) {
        return create_boolean(((Boolean*)a)->value < ((Boolean*)b)->value);
    }
    return create_boolean(false);
}

Object* builtin_greater(Object* a, Object* b) {
    if (a->type != b->type) return create_boolean(false);
    if (a->type == INTEGER) {
        return create_boolean(((Integer*)a)->value > ((Integer*)b)->value);
    }
    if (a->type == BOOL) {
        return create_boolean(((Boolean*)a)->value > ((Boolean*)b)->value);
    }
    return create_boolean(false);
}
`;

exports.main = `
int main() {

    global_closure = (Closure*)malloc(sizeof(Closure));
    global_closure->bindings = NULL;
    lambda_initialization();

    main_body();

    return 0;
}
`;