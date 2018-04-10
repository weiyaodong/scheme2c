(display 
    ((lambda (n)
     ((lambda (fact)
       ((fact fact) n))
       (lambda (fact)
       (lambda (n)
           (if (= 0 n)
               1
               (* n ((fact fact) (- n 1)))))))) 5))