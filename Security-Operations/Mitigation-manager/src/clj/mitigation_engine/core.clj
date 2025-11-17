;; Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
;; (UMU), Jorge Bernal Bernabe (UMU).  See LICENSE file in the project
;; root for details.

(ns mitigation-engine.core
  (:require
   [taoensso.telemere :as t]
   [clojure.core.async :as async]
   [aero.core :refer [read-config]]
   [mitigation-engine.repr :as repr]
   [mitigation-engine.state.alert :as a]
   [mitigation-engine.state.attack-graph :as ag]
   [mitigation-engine.state.workflow :as wf]
   [mitigation-engine.state.workflow-instance :as wi]
   [mount.core :as mount])
  (:import
   (es.um.mitigation_engine MitigationEngine MitigationConstraintProvider)
   (es.um.mitigation_engine.model Mitigation)
   (org.optaplanner.core.api.score.buildin.hardsoft HardSoftScore)
   (org.optaplanner.core.api.solver SolverFactory)
   (org.optaplanner.core.config.solver SolverConfig)
   (org.optaplanner.core.config.solver.termination TerminationConfig)
   (org.optaplanner.core.config.score.director ScoreDirectorFactoryConfig)))

(mount/defstate config
                :start (read-config (clojure.java.io/file "config.edn")))

(def impacted-nodes (async/chan 100))

(defn update-state!
  "Update the current state."
  [alert callback]
  (t/log! "Updating state")
  (t/trace! {:id :state-update
             :level :debug
             :msg nil}
            (swap! ag/attack-graphs #(vec (map (fn [g] (ag/update! g alert callback)) %)))))

(defn solve [alert parameters]
  (let [from-java (fn [solution]
                    (map #(assoc {}
                                 :alert (a/from-java (.getAlert %))
                                 :workflow (wi/from-java (.getWorkflow %)))
                         (filter #(and (.getAlert %)
                                       (.getWorkflow %))
                                 (.getMitigations solution))))
        alerts (seq (list alert))
        workflows (seq @wf/workflows)
        mitigation-slots 10
        seconds-limit 1

        _ (t/log! {:level :debug
                   :data {:alerts alerts
                          :workflows  workflows}
                   :msg "Solver inputs"})

        java-alerts (map a/to-java alerts)
        java-workflows (t/trace! {:id :workflow-instantiation
                                  :level :debug
                                  :msg nil}
                                 (flatten (map #(wf/generate-instances % alert) workflows)))
        java-mitigations (take mitigation-slots (repeatedly #(Mitigation.)))

        _ (t/log! {:data {:alerts (count java-alerts)
                          :workflows  (count java-workflows)
                          :mitigation-slots (count java-mitigations)
                          :seconds-limit seconds-limit}
                   :msg "Running solver"})

        problem (doto (MitigationEngine.)
                  (.setAlerts java-alerts)
                  (.setWorkflows java-workflows)
                  (.setMitigations java-mitigations))
        termination-config (doto (TerminationConfig.)
                             (.setSecondsSpentLimit seconds-limit))
        solver-config (doto (SolverConfig.)
                        (.withSolutionClass MitigationEngine)
                        (.withConstraintProviderClass MitigationConstraintProvider)
                        (.withTerminationConfig termination-config)
                        (.withEntityClasses
                         (into-array Class [Mitigation])))
        factory (SolverFactory/create solver-config)
        solver (.buildSolver factory)
        solution (t/trace! {:id :solver-execution
                            :level :debug
                            :msg nil}
                           (.solve solver problem))
        score (-> solution (.getScore))]
    (t/log! {:data {:solution solution
                    :score (str score)}
             :msg "Solution found"})
    (when (.isFeasible score)
      (doseq [w (from-java solution)]
        (wi/run (:workflow w))))))

(defn handle-alert [alert]
  (t/log! {:data {:alert alert}
           :msg "Handling alert"})
  (t/trace! {:level :debug
             :id :alert-handling
             :msg nil}
            (do
              (update-state! alert
                             (fn [node alert]
                               (t/log! {:data {:node node
                                               :alert alert}
                                        :msg "Attack node triggered"})))
              (solve alert nil))))
