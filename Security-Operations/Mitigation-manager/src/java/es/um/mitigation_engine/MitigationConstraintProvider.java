/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package es.um.mitigation_engine;

import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;
import org.optaplanner.core.api.score.stream.Constraint;
import org.optaplanner.core.api.score.stream.ConstraintFactory;
import org.optaplanner.core.api.score.stream.ConstraintProvider;
import org.optaplanner.core.api.score.stream.Joiners;

import es.um.mitigation_engine.model.Alert;
import es.um.mitigation_engine.model.Mitigation;
import es.um.mitigation_engine.model.WorkflowInstance;

public class MitigationConstraintProvider implements ConstraintProvider {
    @Override
    public Constraint[] defineConstraints(ConstraintFactory factory) {
        return new Constraint[] {
            forbidInvalidMitigations(factory),
            requireAllAlertsMitigated(factory),
            minimizeMitigationCost(factory)
        };
    }

    private Constraint forbidInvalidMitigations(ConstraintFactory factory) {
        return factory.forEach(Mitigation.class)
            .filter(Mitigation::invalid)
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("forbidInvalidMitigations");
    }

    private Constraint requireAllAlertsMitigated(ConstraintFactory factory) {
        return factory.forEach(Alert.class)
            .ifNotExists(Mitigation.class,
                Joiners.equal(a -> a, m -> m.getAlert()),
                Joiners.filtering((a, m) -> m.getWorkflow() != null))
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("requireAlertsAllMitigated");
    }

    private Constraint minimizeMitigationCost(ConstraintFactory factory) {
        return factory.forEach(Mitigation.class)
            .filter(m -> m.getWorkflow() != null)
            .map(Mitigation::getWorkflow)
            .penalize(HardSoftScore.ONE_SOFT, WorkflowInstance::getCost)
            .asConstraint("minimizeMitigationCost");
    }
}
