let general_test =
    `
(define temp
 (let ((x 1)
       (y 2))
  (lambda (z) (+ x y z))))

(define temp2
 (cond ((= 5 1) 1)
       ((= 7 2) 2)
       (else 3)))

(define test 
 (lambda (x)
  (define fuck 1)
  (if (= x 0)
      0
      (+ x (test (- x 1))))))

(define orand
 (lambda (x y z)
  (if x
      (or y z)
      (and y z))))
`;

let curry_test =
    `
(define (apply4 a b c d) (a b c d))
(define (const3 a b c) a) # comment test
(define (const2 a b) (apply4 const3 a b a))
(define fuckyou (lambda (x) x))
(define (error x) (fuckyou 1))
(begin (display (const2 1 2)))
    (display 3))
`;

let cps_test =
    `
(lambda (x) x)
`;

let fold_test =
    `
(define x (lambda (a) a))
(define (apply f x) (f x)) # comment here
(define (app a b c d) (apply (apply a b) (apply c d)))
`;

let yc_test =
    `
(define (y f)
 ((lambda (k) (k k))
  (lambda (x) 
   (f (lambda (y) ((x x) y))))))
(define (fact f)
  (lambda (n) 
    (if (= n 0)
        0
        (+ n (f (- n 1))))))
(define (factt n) ((y fact) n))
`;

let cps_tests = [
    "(lambda (x) x)",
    "(lambda (x) (x 1)",
    "(if (f x) a b)",
    "(if x (f a) b)",
    "(lambda (x) (if (f x) a b))",
    `(lambda (n)
((lambda (fact)
   ((fact fact) n))
 (lambda (fact)
   (lambda (n)
     (if (zero? n)
         1
         (* n ((fact fact) (sub1 n))))))))`,
    `
(define (disp-add x) (display (+ 1 x)))
(disp-add 2)

`
];

let cps_test2 = [
    "(lambda (fact) ((fact fact) n))"
];
