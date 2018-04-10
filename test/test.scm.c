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


ParamList lambda0_param;
ParamList lambda1_param;
ParamList lambda2_param;
ParamList lambda3_param;
ParamList lambda4_param;
ParamList lambda5_param;
ParamList lambda6_param;
ParamList lambda7_param;
ParamList lambda8_param;
ParamList lambda9_param;
ParamList lambda10_param;
ParamList lambda11_param;
ParamList lambda12_param;

Object* lambda0_body(Closure*);
Object* lambda1_body(Closure*);
Object* lambda2_body(Closure*);
Object* lambda3_body(Closure*);
Object* lambda4_body(Closure*);
Object* lambda5_body(Closure*);
Object* lambda6_body(Closure*);
Object* lambda7_body(Closure*);
Object* lambda8_body(Closure*);
Object* lambda9_body(Closure*);
Object* lambda10_body(Closure*);
Object* lambda11_body(Closure*);
Object* lambda12_body(Closure*);

/*
(lambda (c3) 
 (c3 5
     lambda1))
*/
Object *lambda0_body(Closure* closure) {
    Object* c3 = lookup_from_closure("c3", closure);
    Closure* new_closure = derive_closure(((Function*)c3)->scope);
    ParamNode* cur = ((Function*)c3)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, create_integer(5));cur = cur->next;
    push(new_closure, cur->value, create_function(lambda1_body, lambda1_param, closure));
    return ((Function*)c3)->fun(new_closure);
}

/*
(lambda (c0) 
 (display c0))
*/
Object *lambda1_body(Closure* closure) {
    Object* c0 = lookup_from_closure("c0", closure);
    return builtin_display(c0);
    
}

/*
(lambda (n c4) 
 (lambda3 lambda7))
*/
Object *lambda2_body(Closure* closure) {
    Object* n = lookup_from_closure("n", closure);
    Object* c4 = lookup_from_closure("c4", closure);
    Closure* new_closure = derive_closure(closure);
    ParamNode* cur = lambda3_param.head;
    // load parameters
    push(new_closure, cur->value, create_function(lambda7_body, lambda7_param, closure));
    return lambda3_body(new_closure);
}

/*
(lambda (c5) 
 (lambda4 lambda5))
*/
Object *lambda3_body(Closure* closure) {
    Object* c5 = lookup_from_closure("c5", closure);
    Object* n = lookup_from_closure("n", closure);
    Object* c4 = lookup_from_closure("c4", closure);
    Closure* new_closure = derive_closure(closure);
    ParamNode* cur = lambda4_param.head;
    // load parameters
    push(new_closure, cur->value, create_function(lambda5_body, lambda5_param, closure));
    return lambda4_body(new_closure);
}

/*
(lambda (c6) 
 (c6 c5
     c4))
*/
Object *lambda4_body(Closure* closure) {
    Object* c6 = lookup_from_closure("c6", closure);
    Object* c4 = lookup_from_closure("c4", closure);
    Object* c5 = lookup_from_closure("c5", closure);
    Closure* new_closure = derive_closure(((Function*)c6)->scope);
    ParamNode* cur = ((Function*)c6)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, c5);cur = cur->next;
    push(new_closure, cur->value, c4);
    return ((Function*)c6)->fun(new_closure);
}

/*
(lambda (fact c7) 
 (fact fact
       lambda6))
*/
Object *lambda5_body(Closure* closure) {
    Object* fact = lookup_from_closure("fact", closure);
    Object* c7 = lookup_from_closure("c7", closure);
    Object* n = lookup_from_closure("n", closure);
    Closure* new_closure = derive_closure(((Function*)fact)->scope);
    ParamNode* cur = ((Function*)fact)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, fact);cur = cur->next;
    push(new_closure, cur->value, create_function(lambda6_body, lambda6_param, closure));
    return ((Function*)fact)->fun(new_closure);
}

/*
(lambda (c9) 
 (c9 n
     c7))
*/
Object *lambda6_body(Closure* closure) {
    Object* c9 = lookup_from_closure("c9", closure);
    Object* c7 = lookup_from_closure("c7", closure);
    Object* n = lookup_from_closure("n", closure);
    Closure* new_closure = derive_closure(((Function*)c9)->scope);
    ParamNode* cur = ((Function*)c9)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, n);cur = cur->next;
    push(new_closure, cur->value, c7);
    return ((Function*)c9)->fun(new_closure);
}

/*
(lambda (fact c12) 
 (c12 lambda8))
*/
Object *lambda7_body(Closure* closure) {
    Object* fact = lookup_from_closure("fact", closure);
    Object* c12 = lookup_from_closure("c12", closure);
    Closure* new_closure = derive_closure(((Function*)c12)->scope);
    ParamNode* cur = ((Function*)c12)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, create_function(lambda8_body, lambda8_param, closure));
    return ((Function*)c12)->fun(new_closure);
}

/*
(lambda (n c13) 
 (lambda9 (= 0
             n)))
*/
Object *lambda8_body(Closure* closure) {
    Object* n = lookup_from_closure("n", closure);
    Object* c13 = lookup_from_closure("c13", closure);
    Object* fact = lookup_from_closure("fact", closure);
    Closure* new_closure = derive_closure(closure);
    ParamNode* cur = lambda9_param.head;
    // load parameters
    push(new_closure, cur->value, builtin_eq(create_integer(0), n));
    return lambda9_body(new_closure);
}

/*
(lambda (c14) 
 (if c14 
     (c13 1) 
     (lambda10 (- n
                  1))))
*/
Object *lambda9_body(Closure* closure) {
    Object* c14 = lookup_from_closure("c14", closure);
    Object* c13 = lookup_from_closure("c13", closure);
    Object* n = lookup_from_closure("n", closure);
    Object* fact = lookup_from_closure("fact", closure);
    if (((Boolean*)c14)->value) {
    Closure* new_closure = derive_closure(((Function*)c13)->scope);
        ParamNode* cur = ((Function*)c13)->parameters.head;
        // load parameters 
        push(new_closure, cur->value, create_integer(1));
        return ((Function*)c13)->fun(new_closure);
    } else {
    Closure* new_closure = derive_closure(closure);
        ParamNode* cur = lambda10_param.head;
        // load parameters
        push(new_closure, cur->value, builtin_sub(n, create_integer(1)));
        return lambda10_body(new_closure);
    }

}

/*
(lambda (c18) 
 (fact fact
       lambda11))
*/
Object *lambda10_body(Closure* closure) {
    Object* c18 = lookup_from_closure("c18", closure);
    Object* n = lookup_from_closure("n", closure);
    Object* c13 = lookup_from_closure("c13", closure);
    Object* fact = lookup_from_closure("fact", closure);
    Closure* new_closure = derive_closure(((Function*)fact)->scope);
    ParamNode* cur = ((Function*)fact)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, fact);cur = cur->next;
    push(new_closure, cur->value, create_function(lambda11_body, lambda11_param, closure));
    return ((Function*)fact)->fun(new_closure);
}

/*
(lambda (c19) 
 (c19 c18
      lambda12))
*/
Object *lambda11_body(Closure* closure) {
    Object* c19 = lookup_from_closure("c19", closure);
    Object* n = lookup_from_closure("n", closure);
    Object* c13 = lookup_from_closure("c13", closure);
    Object* c18 = lookup_from_closure("c18", closure);
    Closure* new_closure = derive_closure(((Function*)c19)->scope);
    ParamNode* cur = ((Function*)c19)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, c18);cur = cur->next;
    push(new_closure, cur->value, create_function(lambda12_body, lambda12_param, closure));
    return ((Function*)c19)->fun(new_closure);
}

/*
(lambda (c16) 
 (c13 (* n
         c16)))
*/
Object *lambda12_body(Closure* closure) {
    Object* c16 = lookup_from_closure("c16", closure);
    Object* n = lookup_from_closure("n", closure);
    Object* c13 = lookup_from_closure("c13", closure);
    Closure* new_closure = derive_closure(((Function*)c13)->scope);
    ParamNode* cur = ((Function*)c13)->parameters.head;
    // load parameters 
    push(new_closure, cur->value, builtin_mult(n, c16));
    return ((Function*)c13)->fun(new_closure);
}

void lambda_initialization() {
    // the list of global lambdas 
    lambda0_param.head = NULL;
    lambda0_param = push_parameter(lambda0_param, "c3");

    lambda1_param.head = NULL;
    lambda1_param = push_parameter(lambda1_param, "c0");

    lambda2_param.head = NULL;
    lambda2_param = push_parameter(lambda2_param, "c4");
    lambda2_param = push_parameter(lambda2_param, "n");

    lambda3_param.head = NULL;
    lambda3_param = push_parameter(lambda3_param, "c5");

    lambda4_param.head = NULL;
    lambda4_param = push_parameter(lambda4_param, "c6");

    lambda5_param.head = NULL;
    lambda5_param = push_parameter(lambda5_param, "c7");
    lambda5_param = push_parameter(lambda5_param, "fact");

    lambda6_param.head = NULL;
    lambda6_param = push_parameter(lambda6_param, "c9");

    lambda7_param.head = NULL;
    lambda7_param = push_parameter(lambda7_param, "c12");
    lambda7_param = push_parameter(lambda7_param, "fact");

    lambda8_param.head = NULL;
    lambda8_param = push_parameter(lambda8_param, "c13");
    lambda8_param = push_parameter(lambda8_param, "n");

    lambda9_param.head = NULL;
    lambda9_param = push_parameter(lambda9_param, "c14");

    lambda10_param.head = NULL;
    lambda10_param = push_parameter(lambda10_param, "c18");

    lambda11_param.head = NULL;
    lambda11_param = push_parameter(lambda11_param, "c19");

    lambda12_param.head = NULL;
    lambda12_param = push_parameter(lambda12_param, "c16");

}

Object* main_body() {
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
