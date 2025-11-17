;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.state.common
  (:require
   [clojure.spec.alpha :as s]
   [clojure.pprint :as pp]
   [duratom.core :as d]
   [mount.core :as mount]))

(s/def ::id uuid?)
(s/def ::description string?)
(s/def ::params map?)
(s/def ::args map?)
(s/def ::mitre-id string?)

(defmacro list [of]
  `(s/coll-of ~of :kind list?))

(defmacro vector [of]
  `(s/coll-of ~of :kind vector?))

(defmacro dict [& of]
  `(s/keys :req-un [~@of]))

(defn merge-args [params args alert]
  (let [resolve-entry
        (fn [[k v]]
          (cond
            ;; if value is a string => required field
            (keyword? v)
            [k (get alert v)]

            ;; if value is a list/vector => at least one must exist
            (sequential? v)
            [k (some #(get alert %) v)]

            :else [k nil]))]

    ;; attempt to resolve all arg->value pairs
    (let [entries (map resolve-entry args)]
      (when (every? some? entries)
        (merge params (into {} entries))))))

(defn read-db [file]
  (with-open [r (clojure.java.io/reader file)]
    (read (java.io.PushbackReader. r))))

(defn write-db [file x]
  (with-open [r (clojure.java.io/writer file)]
    (pp/pprint x r)))


(defn start-db [file spec]
  (let [atom (d/duratom :local-file
                        :file-path file
                        :init []
                        :rw {:read read-db
                             :write write-db})]
    (when-not (s/valid? spec @atom)
      (throw (ex-info "Invalid state loaded"
                      {:problems (s/explain-data spec @atom)})))
    atom))

(defn stop-db [db])

(defmacro when-valid [edn spec & body]
  `(if (not (s/valid? ~spec ~edn))
     (throw (ex-info "Invalid state loaded"
                     {:problems (s/explain-data ~spec ~edn)}))
     ~@body))

(defn add-to-db [db id edn spec]
  (when-valid edn spec
    (swap! db assoc id edn)))

(defn remove-from-db [db id]
  (swap! db dissoc id))

(defmacro defdb [name path spec]
  `(do
     (mount/defstate ~name
                     :start (start-db ~path (c/vector ~spec))
                     :stop (stop-db ~path))
     (defn ~(symbol (str "add-to-" name)) [~'id ~'edn]
       (add-to-db ~name ~'id ~'edn ~spec))
     (defn ~(symbol (str "remove-from-" name)) [~'id]
       (remove-from-db ~name ~'id))))
