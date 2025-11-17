;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.attack-graph
  (:require
   [clojure.spec.alpha :as s]
   [mitigation-engine.state.attack :as a]
   [mitigation-engine.state.common :as c]
   [mitigation-engine.state.node :as n]))

(s/def ::nodes (c/list ::n/node))
(s/def ::attacks (s/map-of ::c/id ::a/attack))
(s/def ::initial-node ::c/id)

(s/def ::attack-graph (c/dict ::c/description ::nodes ::attacks ::initial-node))

(c/defdb attack-graphs "data/attack-graphs.edn" ::attack-graph)

(defn clean
  "Purge all ongoing attacks."
  [attack-graph]
  (assoc attack-graph :attacks []))

(defn attacks [attack-graph]
  (:attacks attack-graph))

(defn nodes [attack-graph]
  (:nodes attack-graph))

(defn update!
  "Return the attack graph, potentially updated if the alert matched any
   attacks.  Run callback on nodes+alert if they match."
  [attack-graph alert callback]
  (let [initial-node (n/get (nodes attack-graph) (:initial-node attack-graph))]
    (cond-> attack-graph
      :always
      (update :attacks update-vals #(a/update! % alert (nodes attack-graph) callback))

      (n/triggered? initial-node alert)
      (assoc-in (vector :attacks (random-uuid)) (a/new alert initial-node (:nodes attack-graph) callback)))))
