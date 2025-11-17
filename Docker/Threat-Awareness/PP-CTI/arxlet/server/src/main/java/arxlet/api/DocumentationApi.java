/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.api;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.net.URL;

@Path("/docs")
public class DocumentationApi {
    @GET
    public InputStream getDocumentation() {
        URL fileUrl = getClass().getResource("/redoc-static.html");
        if (fileUrl == null) {
            return null;
        }
        File file = new File(fileUrl.getFile());
        try {
            return new FileInputStream(file);
        } catch (FileNotFoundException e) {
            return null;
        }
    }
}
