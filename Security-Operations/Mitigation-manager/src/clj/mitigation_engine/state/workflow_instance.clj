;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.workflow-instance
  (:require
   [taoensso.telemere :as t]
   [clojure.spec.alpha :as s]
   [mitigation-engine.state.common :as c]
   [mitigation-engine.state.workflow :as w]
   [cheshire.core :as json]
   [org.httpkit.client :as http])
  (:import
   (java.net URI)
   (es.um.mitigation_engine.model Workflow WorkflowInstance MitreTechnique Parameter ParameterType)))

(s/def ::parameters map?)

(s/def ::signature ::w/workflow)

(s/def ::workflow-instance (c/dict ::signature ::parameters))

(defn from-java [workflow]
  {:signature (w/from-java (.getSignature workflow))
   :parameters (.getParameters workflow)})

(defn run [workflow-instance]
  (let [signature (:signature workflow-instance)
        description (:description signature)
        url (:url signature)
        body (:parameters workflow-instance)
        json-body (json/generate-string body)
        _ (t/log! {:data {:description description
                          :url url
                          :body body}
                   :msg "Running workflow instance"})
        response (t/trace! {:level :debug
                            :id :workflow-execution
                            :msg nil}
                           @(http/post url {:body json-body
                                            :content-type :json}))]
    (t/log! {:msg "Workflow instance executed"})
    (when (= 200 (:status response))
      (t/log! {:level :debug
               :data (:body response)
               :msg "Workflow response"})
      (:body response))))
