/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine.model;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;

import clojure.lang.Keyword;

public class Alert {
    private final String description;
    private final LocalDateTime timestamp;
    private final Collection<MitreTechnique> techniques;
    private final Map<Keyword, Object> data;

    public Alert(
            String description,
            LocalDateTime timestamp,
            Collection<MitreTechnique> techniques,
            Map<Keyword, Object> data) {
        this.description = description;
        this.timestamp = timestamp;
        this.techniques = new HashSet<>(techniques);
        this.data = data;
    }

    public String getDescription() {
        return description;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public Collection<MitreTechnique> getTechniques() {
        return techniques;
    }

    public Map<Keyword, Object> getData() {
        return data;
    }

    @Override
    public String toString() {
        return "Alert [description=" + description + ", timestamp=" + timestamp + ", techniques=" + techniques
                + ", data=" + data + "]";
    }
}
