(defproject mitigation-engine "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :license {:name "EPL-2.0 OR GPL-2.0-or-later WITH Classpath-exception-2.0"
            :url "https://www.eclipse.org/legal/epl-2.0/"}
  :dependencies [[org.clojure/clojure "1.11.1"]
                 [org.clojure/tools.logging "1.3.0"]
                 [tupelo "25.07.04"]
                 [org.optaplanner/optaplanner-core "9.43.0.Final"]
                 [ring/ring-core "1.14.2"]
                 [ring/ring-jetty-adapter "1.14.2"]
                 [ring/ring-json "0.5.1"]
                 [compojure "1.7.1"]
                 [com.taoensso/telemere "1.1.0"]
                 [com.taoensso/telemere-slf4j "1.1.0"]
                 [cheshire "6.1.0"]
                 [com.monkeyprojects/nats "0.3.0"]
                 [gorillalabs/neo4j-clj "5.1.0"]
                 [mount "0.1.23"]
                 [aero "1.1.6"]
                 [duratom "0.5.9"]
                 [http-kit "2.3.0"]]
  :main ^:skip-aot mitigation-engine.main
  :target-path "target/%s"
  :profiles {:uberjar {:aot :all
                       :jvm-opts ["-Dclojure.compiler.direct-linking=true"]}
             :dev {:dependencies [[virgil "0.4.0"]]}}
  :source-paths ["src/clj"]
  :java-source-paths ["src/java"]
  :plugins [[lein-git-version "0.0.5"]])
