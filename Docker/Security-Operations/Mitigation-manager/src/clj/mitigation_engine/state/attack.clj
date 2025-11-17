;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.attack
  (:require
   [taoensso.telemere :as t]
   [clojure.spec.alpha :as s]
   [mitigation-engine.state.alert :as a]
   [mitigation-engine.state.common :as c]
   [mitigation-engine.state.node :as n]))

(s/def ::attack-front (c/list ::n/node))
(s/def ::ctx (c/list ::a/alert))

(s/def ::attack (c/dict ::ctx ::attack-front))

(defn advanced? [attack-instance alert]
  ;; An alert advances an attack instance if one of the nodes in the
  ;; attack front is triggered by the alert.
  (some (fn [[k v]] (n/triggered? v alert))
        (:attack-front attack-instance)))

(defn new
  "Create a new attack from an alert and the node it triggers, and run
  callback."
  [alert node nodes callback]
  (let [attack {:ctx (list alert)
                :attack-front (map #(n/get nodes %) (:next node))}]
    (t/log! {:level :debug
             :data {:initial-node node
                    :alert alert
                    :attack attack}
             :msg "New attack created"})
    (apply callback (list node alert))
    attack))

(defn update!
  "Return the attack, unless it is triggered by the alert in which case
   return the attack modified accordingly.  Runs callback on the nodes
   that have advanced."
  [attack alert nodes callback]
  (let [old-attack-front (:attack-front attack)
        new-attack-front (flatten (map #(n/advance! % alert nodes callback)
                                       (:attack-front attack)))]
    (cond-> attack
      :always
      (update :attack-front (constantly new-attack-front))

      ;; Only when there's been a change in the attack front
      (not (= old-attack-front new-attack-front))
      (update :ctx #(cons alert %)))))
