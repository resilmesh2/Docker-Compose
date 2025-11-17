;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.nats
  (:require
   [monkey.nats.core :as nats]
   [cheshire.core :as json]
   [mount.core :as mount]
   [mitigation-engine.core :as core]
   [mitigation-engine.state.alert :as alert]))

(defn- nats-message-to-edn
  [message]
  (-> message
      (.getData)
      (String.)
      (json/parse-string true)))

(defn- handle-alert [alert]
  (-> alert
      (json/parse-string true)
      (alert/to-alert)
      (core/handle-alert)))

(defn- make-client []
  (let [url (str (:nats-host core/config) \: (:nats-port core/config))
        ssl (:nats-ssl core/config)
        con (nats/make-connection {:urls [url]
                                   :secure? ssl})
        sub (nats/subscribe con (:nats-topic core/config) handle-alert {})]
    {:connection con
     :subscription sub}))

(defn- delete-client [client]
  (nats/unsubscribe (:subscription client))
  (.close (:connection client)))

(mount/defstate client
                :start (make-client)
                :stop (delete-client client))

(defn send-message [topic message]
  (nats/publish (:connection client) topic message {}))
