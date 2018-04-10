((lambda (c3) 
  (c3 5
      (lambda (c0) 
       (display c0)))) (lambda (n c4) 
                        ((lambda (c5) 
                          ((lambda (c6) 
                            (c6 c5
                                c4)) (lambda (fact c7) 
                                      (fact fact
                                            (lambda (c9) 
                                             (c9 n
                                                 c7)))))) (lambda (fact c12) 
                                                           (c12 (lambda (n c13) 
                                                                 ((lambda (c14) 
                                                                   (if c14 
                                                                       (c13 1) 
                                                                       ((lambda (c18) 
                                                                         (fact fact
                                                                               (lambda (c19) 
                                                                                (c19 c18
                                                                                     (lambda (c16) 
                                                                                      (c13 (* n
                                                                                              c16))))))) (- n
                                                                                                            1)))) (= 0
                                                                                                                     n))))))))