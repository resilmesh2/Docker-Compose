/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine;

import java.util.ArrayList;
import java.util.Collection;

import org.optaplanner.core.api.domain.solution.PlanningEntityCollectionProperty;
import org.optaplanner.core.api.domain.solution.PlanningScore;
import org.optaplanner.core.api.domain.solution.PlanningSolution;
import org.optaplanner.core.api.domain.solution.ProblemFactCollectionProperty;
import org.optaplanner.core.api.domain.valuerange.ValueRangeProvider;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;

import es.um.mitigation_engine.model.Alert;
import es.um.mitigation_engine.model.Mitigation;
import es.um.mitigation_engine.model.WorkflowInstance;

@PlanningSolution
public class MitigationEngine {

    @PlanningScore
    private HardSoftScore score;

    @ValueRangeProvider(id = "alerts")
    @ProblemFactCollectionProperty
    private Collection<Alert> alerts = new ArrayList<>();

    @ValueRangeProvider(id = "workflows")
    @ProblemFactCollectionProperty
    private Collection<WorkflowInstance> workflows = new ArrayList<>();

    @ValueRangeProvider
    @PlanningEntityCollectionProperty
    private Collection<Mitigation> mitigations = new ArrayList<>();

    public HardSoftScore getScore() {
        return score;
    }

    public void setScore(HardSoftScore score) {
        this.score = score;
    }

    public Collection<Alert> getAlerts() {
        return alerts;
    }

    public void setAlerts(Collection<Alert> alerts) {
        this.alerts.clear();
        this.alerts.addAll(alerts);
    }

    public Collection<WorkflowInstance> getWorkflows() {
        return workflows;
    }

    public void setWorkflows(Collection<WorkflowInstance> workflows) {
        this.workflows.clear();
        this.workflows.addAll(workflows);

    }

    public Collection<Mitigation> getMitigations() {
        return mitigations;
    }

    public void setMitigations(Collection<Mitigation> mitigations) {
        this.mitigations.clear();
        this.mitigations.addAll(mitigations);
    }
}
