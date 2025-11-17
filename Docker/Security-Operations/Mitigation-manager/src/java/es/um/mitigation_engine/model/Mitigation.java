/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine.model;

import org.optaplanner.core.api.domain.entity.PlanningEntity;
import org.optaplanner.core.api.domain.variable.PlanningVariable;

@PlanningEntity
public class Mitigation {

    @PlanningVariable(nullable = true, valueRangeProviderRefs = "workflows")
    private WorkflowInstance workflow;

    @PlanningVariable(nullable = false, valueRangeProviderRefs = "alerts")
    private Alert alert;

    public WorkflowInstance getWorkflow() {
        return workflow;
    }

    public boolean invalid() {
        return workflow != null && !workflow.getSignature().applicableTo(alert);
    }

    public Alert getAlert() {
        return alert;
    }
}
