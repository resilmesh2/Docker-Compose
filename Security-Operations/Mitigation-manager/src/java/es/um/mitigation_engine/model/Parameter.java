/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine.model;

import clojure.lang.Keyword;

public class Parameter {

    private final Keyword name;

    private final ParameterType type;

    public Parameter(Keyword name, ParameterType type) {
        this.name = name;
        this.type = type;
    }

    public Keyword getName() {
        return name;
    }

    public ParameterType getType() {
        return type;
    }

    @Override
    public String toString() {
        return "Parameter [name=" + name + ", type=" + type + "]";
    }
}
