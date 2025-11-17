/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.anonymizer;

public class ArxletException extends Exception {

    private final String type;

    public ArxletException(String message) {
        super(message);
        this.type = this.getClass().getName();
    }

    public ArxletException(String message, Throwable cause) {
        super(message, cause);
        this.type = cause.getClass().getName();
    }

    public String getType() {
        return type;
    }
}
