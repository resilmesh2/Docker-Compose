/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.api;

import arxlet.anonymizer.Anonymizer;
import arxlet.model.VersionResponse;

import arxlet.util.Json;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;


import java.io.InputStream;
import java.util.Map;
import java.util.List;


@Path("/version")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T17:03:26.350501121+01:00[Europe/Madrid]")
public class VersionApi {

    private static final String VERSION = "1.0";

    @GET
    @Produces({ "application/json" })
    public Response versionGet() {
        try {
            VersionResponse response = new VersionResponse();
            response.setVersion(VERSION);
            String[] split = VERSION.split("\\.");
            int major = Integer.parseInt(split[0]);
            response.setMajor(major);
            int minor = Integer.parseInt(split[1]);
            response.setMinor(minor);
            return Response.ok().entity(Json.from(response)).build();
        } catch (JsonProcessingException | NumberFormatException e) {
            return Response.serverError().build();
        }
    }
}
