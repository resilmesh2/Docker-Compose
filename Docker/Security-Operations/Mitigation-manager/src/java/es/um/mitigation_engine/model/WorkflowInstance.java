/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine.model;

import java.util.HashMap;
import java.util.Map;

import clojure.lang.Keyword;

public class WorkflowInstance {

    private final Workflow signature;

    private final Map<Keyword, Object> parameters = new HashMap<>();

    private final double costFactor;

    public WorkflowInstance(Workflow signature, Map<Keyword, Object> parameters, double costFactor) {
        this.signature = signature;
        parameters.forEach((k, v) -> this.parameters.put(k, v));
        this.costFactor = costFactor;
    }

    public Workflow getSignature() {
        return signature;
    }

    public Map<Keyword, Object> getParameters() {
        return parameters;
    }

    public double getCostFactor() {
        return costFactor;
    }

    public int getCost() {
        return (int)Math.round(signature.getCost() * costFactor * 1000);
    }

    @Override
    public String toString() {
        return "WorkflowInstance [signature=" + signature + ", parameters=" + parameters + ", costFactor=" + costFactor
                + "]";
    }

}
