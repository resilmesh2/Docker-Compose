import com.github.gradle.node.npm.task.NpxTask
import org.openapitools.generator.gradle.plugin.tasks.GenerateTask
import org.openapitools.generator.gradle.plugin.tasks.ValidateTask

plugins {
    id("base")
    id("org.openapi.generator").version("7.2.0")
    id("com.github.node-gradle.node").version("7.0.1")
}

var schemaDir = layout.buildDirectory.dir("schema")
var schemaPath: String = schemaDir.get().asFile.path
var generatedDir = layout.buildDirectory.dir("generated")
var generatedPath: String = generatedDir.get().asFile.path

tasks.register<GenerateTask>("generateServer") {
    group = "build"
    description = "Generates a project stub based on the OpenAPI template file"
    dependsOn(":api:validateSchema")

    generatorName.set("jaxrs-spec")
    inputSpec.set("$schemaPath/openapi.yaml")
    outputDir.set("$generatedPath/server")
    apiPackage.set("arxlet.api")
    modelPackage.set("arxlet.model")
    invokerPackage.set("arxlet.invoker")
    configOptions.set(mapOf(
            "useJakartaEe" to "true",
            "useSwaggerAnnotations" to "false",
            "useBeanValidation" to "false"
    ))
}

tasks.register<GenerateTask>("generateClient") {
    group = "build"
    description = "Generates a project stub based on the OpenAPI template file"
    dependsOn(":api:validateSchema")

    generatorName.set("python")
    inputSpec.set("$schemaPath/openapi.yaml")
    outputDir.set("$generatedPath/client")
    configOptions.set(mapOf(
            "library" to "asyncio",
            "packageName" to rootProject.name,
            "generateSourceCodeOnly" to "true",
            "packageVersion" to project.version.toString()
    ))
}

tasks.register<NpxTask>("generateDocs") {
    group = "build"
    description = "Generates Redoc-style documentation based on the OpenAPI template file"
    dependsOn(":api:validateSchema")

    workingDir.set(layout.buildDirectory.dir("generated/docs"))
    command.set("@redocly/cli")
    args.set(listOf("build-docs", "$schemaPath/openapi.yaml"))
}

tasks.register<ValidateTask>("validateSchema") {
    dependsOn(":api:prepareSchema")
    inputSpec.set("$schemaPath/openapi.yaml")
}

tasks.register<Copy>("prepareSchema") {
    description = "Preprocesses the OpenAPI template file according to the project settings"
    from("openapi.yaml")
    into(schemaDir)
    filter { l -> l.replace("<Automatically generated>", project.version.toString()) }
}