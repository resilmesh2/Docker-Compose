/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.api;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

@Path("/debug")
public class DebugApi {

    @GET
    @Path("/hello-world")
    public String getHelloWorld() {
        return "Hello World!";
    }
}
