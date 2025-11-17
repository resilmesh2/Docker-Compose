;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.repr
  (:require
   [clojure.pprint :as pprint])
  (:import
   (es.um.mitigation_engine MitigationEngine)
   (es.um.mitigation_engine.model Alert Mitigation WorkflowInstance MitreTechnique)))

(defn techniques [techniques]
  (into [] (map str techniques)))

(defn alert [^Alert alert]
  (when alert
    (merge (bean alert)
           {:techniques (techniques (.getTechniques alert))})))

(defn workflow [^WorkflowInstance workflow]
  (when workflow
    (merge (bean workflow)
           {:target (str (.getTarget (.getSignature workflow)))
            :parameters (map bean (.getParameters workflow))})))

(defn mitigation [^Mitigation mitigation]
  (when mitigation
    (merge (bean mitigation)
           {:alert (alert (.getAlert mitigation))
            :workflow (workflow (.getWorkflow mitigation))})))

(defn print-solution [^MitigationEngine solution]
  (pprint/pprint (-> solution
                     (.getMitigations)
                     (seq)
                     (first)
                     (mitigation))))
