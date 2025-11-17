plugins {
    id("java")
    id("war")
}

war.webAppDirName = "WebContent"

repositories {
    mavenCentral()
}

dependencies {
    compileOnly("jakarta.ws.rs:jakarta.ws.rs-api:3.1.0")
    providedCompile("jakarta.annotation:jakarta.annotation-api:2.1.0")
    implementation("org.glassfish.jersey.media:jersey-media-json-jackson:3.1.5")
    implementation("org.glassfish.jersey.containers:jersey-container-servlet:3.1.5")
    implementation("org.glassfish.jersey.inject:jersey-hk2:3.1.5")
    implementation(fileTree("lib"))

    testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.1")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.10.1")
}

tasks.register<Copy>("prepareDockerDir") {
    description = "Copies all files necessary to build the Docker image to a build directory"
    dependsOn(":server:war")
    from(layout.projectDirectory, layout.buildDirectory.dir("libs"))
    into(layout.buildDirectory.dir("docker"))
    include("Dockerfile", "${project.name}.war")
}

tasks.register<Exec>("dockerImage") {
    group = "build"
    description = "Builds a Docker image based on the Dockerfile configuration. The image is tagged after the root project's name and version."
    dependsOn(":server:prepareDockerDir")
    workingDir(layout.buildDirectory)
    commandLine("docker", "build", "-t", "${rootProject.name.lowercase()}:${project.version}", "--build-arg", "war_name=${project.name}", "docker")
}

tasks.war {
    archiveFileName = "${project.name}.war"
}