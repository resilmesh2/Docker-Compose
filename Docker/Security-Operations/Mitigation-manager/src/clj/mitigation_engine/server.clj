;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.server
  (:require
   [taoensso.telemere :as t]
   [mitigation-engine.state.alert :as alerts]
   [mitigation-engine.core :as core]
   [compojure.core :refer :all]
   [ring.middleware.json :refer [wrap-json-response wrap-json-body]]
   [ring.util.response :as response]
   [ring.adapter.jetty :refer [run-jetty]]
   [mount.core :as mount]))

(def resource-store {})

(defmacro resource
  "Create a pair of endpoints to manage a resource."
  [name]
  (let [path (str "/" name)]
    `(list '(GET ~path [] (retrieve-resource resource-store ~name))
           '(POST ~path ~'req (create-resource resource-store ~'req ~name)))))

(defmacro when-json
  "If the incoming request doesn't have a JSON body, returns a Ring 406
  response.  Otherwise, it executes the provided forms."
  [req & args]
  `(if (not (= "application/json" (get-in ~req [:headers "content-type"])))
     {:status 406
      :headers {"Content-Type" "application/json"}
      :body {:error "Only application/json supported"}}
     (do ~@args)))

(defn handle-alert [req]
  (t/log! {:level :debug
           :data {:request req}
           :msg "New request received"})
  (when-json req
    (let [alert (:body req)
          parsed-alert (alerts/to-alert alert)]
      (core/handle-alert parsed-alert)
      (response/response {}))))

(defn create-resource [store req type]
  (when-json req
    (throw (ex-info "Not yet implemented"))))

(defn retrieve-resource [store type]
  (response/response (throw (ex-info "Not yet implemented"))))

(defn get-version []
  (let [v (:version core/config)
        v1 (get v 0)
        v2 (get v 1)
        v3 (get v 2)]
    {:version (str v1 "." v2 "." v3)
     :major v1
     :minor v2}))

(defmacro make-routes [clients]
  `(routes
    (GET "/" [] (response/response nil))
    (POST "/" ~'req (when-json ~'req (response/response nil)))
    (GET "/version" [] (response/response (get-version)))
    (POST "/alert" ~'req (handle-alert ~'req))
    ~@(resource "condition")
    ~@(resource "node")
    ~@(resource "workflow")))

(defn run-server []
  (run-jetty (-> (make-routes nil)
                 (wrap-json-body {:keywords? true})
                 (wrap-json-response))
             {:port (:port core/config)
              :join? false}))

(defn- start []
  (let [server (t/trace! {:level :debug
                          :id :server-start
                          :msg nil}
                         (run-server))]
    (t/log! "Server started")
    server))

(defn- stop [server]
  (t/trace! {:level :debug
             :id :server-stop
             :msg nil}
            (.stop server))
  (t/log! "Server stopped"))

(mount/defstate instance
                :start (start)
                :stop (stop instance))
