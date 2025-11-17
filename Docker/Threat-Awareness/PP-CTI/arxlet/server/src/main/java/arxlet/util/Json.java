/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class Json {

    private static final ObjectMapper mapper = new ObjectMapper();
    public static String from(Object object) throws JsonProcessingException {
        return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(object);
    }

}
