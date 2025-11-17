/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine.model;

import java.util.Set;

public class Workflow {

    private final MitreTechnique target;

    private final Set<Parameter> parameters;

    private final double cost;

    private final String url;

    private final String description;

    public Workflow(MitreTechnique target,
            Set<Parameter> parameters,
            double cost,
            String url,
            String description) {
        this.target = target;
        this.parameters = parameters;
        this.cost = cost;
        this.url = url;
        this.description = description;
    }

    public MitreTechnique getTarget() {
        return target;
    }

    public Set<Parameter> getParameters() {
        return parameters;
    }

    public boolean applicableTo(Alert alert) {
        return alert.getTechniques().stream().anyMatch(t -> t.equals(this.getTarget()));
    }

    public double getCost() {
        return cost;
    }

    public String getUrl() {
        return url;
    }

    public String getDescription() {
        return description;
    }

    @Override
    public String toString() {
        return "Workflow [target=" + target + ", parameters=" + parameters + ", cost=" + cost + "]";
    }

}
