;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.node
  (:require
   [taoensso.telemere :as t]
   [clojure.set :as set]
   [clojure.spec.alpha :as s]
   [mitigation-engine.state.common :as c]
   [mitigation-engine.state.condition :as cd]))

(s/def ::mitre-ids (c/list ::c/mitre-id))
(s/def ::conditions (c/list ::cd/condition))
(s/def ::next (c/list ::c/id))
(s/def ::previous (c/list ::c/id))

(s/def ::node (c/dict ::c/id ::c/description ::mitre-ids ::conditions ::next ::previous))

(defn get [nodes node-id]
  (let [node (some #(when (= node-id (:id %))%) nodes)]
    node))

(defn triggered? [node alert]
  ;; An alert triggers a node if all the node's MITRE IDs are also in
  ;; the alert.
  (set/subset? (set (:mitre-ids node)) (set (:mitre-ids alert))))

(defn advance!
  "Returns the nodes next in line, unless the node is not triggered by
   the alert, in which case it returns a list containing only the
   current node.  Runs callback on the node and alert if it advances."
  [node alert nodes callback]
  (cond
    (triggered? node alert)
    (do
      (t/log! {:level :debug
               :data {:node node
                      :alert alert}
               :msg "Node triggered"})
      (apply callback (list node alert))
      (map #(get nodes %) (:next node)))

    :else
    (list node)))
