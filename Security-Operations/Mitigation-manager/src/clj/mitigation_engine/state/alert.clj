;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.alert
  (:require
   [taoensso.telemere :as t]
   [clojure.spec.alpha :as s]
   [mitigation-engine.util :as util]
   [mitigation-engine.state.common :as c]
   [duratom.core :as d])
  (:import
   (java.time LocalDateTime)
   (es.um.mitigation_engine.model Alert MitreTechnique)))

(s/def ::alert map?)
(s/def ::field-mappings map?)

(c/defdb field-mappings "data/field-mappings.edn" ::field-mappings)

(defn to-alert
  ([data] (to-alert data (first @field-mappings) []))
  ([data sch path]
   (reduce-kv
    (fn [acc k v]
      (if-not (contains? data k)
        acc
        (let [value (get data k)
              full-path (conj path k)]
          (cond
            (map? v)
            (do
              (when-not (map? value)
                (throw (ex-info "Expected map"
                                {:path full-path
                                 :expected :map
                                 :got (type value)})))
              (merge acc (to-alert value v full-path)))

            (keyword? v)
            (do
              (when-not (or (string? value)
                            (number? value)
                            (boolean? value)
                            (vector? value)
                            (nil? value))
                (throw (ex-info "Expected primitive"
                                {:path full-path
                                 :expected :primitive
                                 :got (type value)})))
              (assoc acc v value))

            :else acc))))
    {}
    sch)))

(defn to-java [alert]
  (when (s/valid? ::alert alert)
    (Alert. "Alert"
            (LocalDateTime/now)
            (java.util.ArrayList. (or (map #(MitreTechnique. %) (:mitre-ids alert)) '()))
            (java.util.HashMap. alert))))

(defn from-java [alert]
  (.getData alert))
