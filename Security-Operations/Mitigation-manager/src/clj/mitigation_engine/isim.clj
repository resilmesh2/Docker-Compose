;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.isim
  (:require
   [neo4j-clj.core :as neo4j]
   [mount.core :as mount]
   [mitigation-engine.core :as core]))

(defn- start-client []
  (let [host (:isim-host core/config)
        port (:isim-port core/config)
        uri (java.net.URI. (str "bolt://" host \: port))
        username (:isim-username core/config)
        password (:isim-password core/config)]
    (neo4j/connect uri username password)))

(defn- stop-client [client]
  (neo4j/disconnect client))

(mount/defstate client
          :start (start-client)
          :stop (stop-client client))

;; Execute query
(defn check [query & [params]]
  (neo4j/with-transaction client tx
    (neo4j/execute tx query (or params {}))))
