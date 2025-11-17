/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.api;

import arxlet.anonymizer.ArxletException;
import arxlet.anonymizer.AttributeAnonymizer;
import arxlet.model.AttributeRequest;
import arxlet.model.ExceptionResponse;
import arxlet.util.Json;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;


@Path("/attributes")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-01-02T09:52:28.543903470+01:00[Europe/Madrid]")
public class AttributesApi {

    @POST
    @Consumes({ "application/json" })
    @Produces({ "application/json" })
    public Response attributes1(AttributeRequest attributeRequest) {
        try {
            return AttributeAnonymizer.anonymize(attributeRequest);
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
