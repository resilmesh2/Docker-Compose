;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.condition
  (:require
   [clojure.spec.alpha :as s]
   [mitigation-engine.state.alert :as a]
   [mitigation-engine.state.common :as c]))

(s/def ::query list?)

(s/def ::condition (c/dict ::c/description ::c/params ::c/args  ::query))

(declare ^:dynamic *args*)

(defn check
  ([condition]
   (check condition {}))
  ([condition alert]
   (let [args (c/merge-args (:params condition)
                            (:args condition)
                            alert)]
     (when args
       (binding [*args* args]
         (eval (:query condition)))))))
