/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.api;

import arxlet.anonymizer.ArxletException;
import arxlet.anonymizer.ObjectAnonymizer;
import arxlet.model.ExceptionResponse;
import arxlet.model.ObjectRequest;
import arxlet.util.Json;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;


@Path("/objects")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-01-02T09:52:28.543903470+01:00[Europe/Madrid]")
public class ObjectsApi {

    @POST
    @Consumes({ "application/json" })
    @Produces({ "application/json" })
    public Response objects1(ObjectRequest objectRequest) {
        try {
            return ObjectAnonymizer.anonymize(objectRequest);
        } catch (ArxletException e) {
            ExceptionResponse response = new ExceptionResponse();
            response.setException(e.getType());
            response.setMessage(e.getMessage());
            try {
                return Response.status(400).entity(Json.from(response)).build();
            } catch (JsonProcessingException e2) {
                return Response.serverError().build();
            }
        }
    }
}
