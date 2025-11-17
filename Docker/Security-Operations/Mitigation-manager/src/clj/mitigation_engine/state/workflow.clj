;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.workflow
  (:require
   [taoensso.telemere :as t]
   [clojure.spec.alpha :as s]
   [mitigation-engine.state.common :as c]
   [mitigation-engine.state.condition :as cd])
  (:import
   (java.net URI)
   (es.um.mitigation_engine.model Workflow WorkflowInstance MitreTechnique Parameter ParameterType)))

(s/def ::cost double?)
(s/def ::url #(try (URI. %) true (catch Exception _ false)))
(s/def ::conditions (c/list ::cd/condition))

(s/def ::workflow (c/dict ::c/description ::url ::c/mitre-id ::cost ::c/params ::c/args ::conditions))

(c/defdb workflows "data/workflows.edn" ::workflow)

(s/def ::workflow-instance (c/dict ::c/mitre-id ::cost ::cost-factor))

(defn to-java [workflow]
  (when (s/valid? ::workflow workflow)
    (let [technique (MitreTechnique. (:mitre-id workflow))
          parameters (set (map #(Parameter. (first %)
                                            (ParameterType/ANY))
                               (merge (:params workflow)
                                      (:args workflow))))
          cost (:cost workflow)]
      (Workflow. technique parameters cost (:url workflow) (:description workflow)))))

(defn from-java [workflow]
  {:description (.getDescription workflow)
   :url (.getUrl workflow)
   :mitre-id (.getId (.getTarget workflow))
   :cost (.getCost workflow)
   :params (into {} (for [param (.getParameters workflow)]
                      [(.getName param) nil]))})

(defn generate-instances [workflow alert]
  ;; For now, we will just add the parameters from the alert and go
  ;; with that.
  (let [parameters (c/merge-args (:params workflow) (:args workflow) alert)]
    (t/log! {:level :debug
             :data {:signature workflow
                    :parameters parameters}
             :msg "Instanciating workflow from alert"})
    (list (WorkflowInstance. (to-java workflow) parameters 1.0))))
