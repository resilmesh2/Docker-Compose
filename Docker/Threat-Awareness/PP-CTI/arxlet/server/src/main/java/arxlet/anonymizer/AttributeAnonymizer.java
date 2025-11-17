/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.anonymizer;

import arxlet.model.AttributeDataInner;
import arxlet.model.AttributeRequest;
import arxlet.model.PetsInner;
import arxlet.util.Json;
import jakarta.ws.rs.core.Response;
import org.deidentifier.arx.*;
import org.deidentifier.arx.criteria.KAnonymity;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

public class AttributeAnonymizer extends Anonymizer {

    public static Response anonymize(AttributeRequest request) throws ArxletException {
        ARXAnonymizer anonymizer = new ARXAnonymizer();
        Data.DefaultData data = Data.DefaultData.create();
        ARXConfiguration config = ARXConfiguration.create();

        // Error checking
        if (request == null) return Response.status(400).build();
        if (request.getData().size() <= 1) return Response.status(400).build();
        if (request.getPets().isEmpty()) return Response.status(400).build();

        String attributeName = "Attribute";
        AttributeType.Hierarchy.DefaultHierarchy attributeHierarchy = AttributeType.Hierarchy.create();

        data.add(attributeName);
        data.getDefinition().setDataType(attributeName, DataType.STRING);
        data.getDefinition().setAttributeType(attributeName, attributeHierarchy);

        for (PetsInner p : request.getPets()) {
            //noinspection SwitchStatementWithTooFewBranches
            switch (p.getScheme().toLowerCase()) {
                case "k-anonymity" -> {
                    if (p.getMetadata().getK() > request.getData().size())
                        return Response.status(400).build();
                    config.addPrivacyModel(new KAnonymity(p.getMetadata().getK()));
                }
                // Currently attributes can only be processed with k-anonymity, but switch was used for future-proofing.
            }
        }
        for (AttributeDataInner attributeDataInner : request.getData()) {
            data.add(attributeDataInner.getValue());
            if (attributeDataInner.getHierarchies().isEmpty()) return Response.status(400).build();
            attributeHierarchy.add(attributeDataInner.getHierarchies().toArray(new String[0]));
        }
        try {
            ARXResult result = anonymizer.anonymize(data, config);
            List<String> attributes = new ArrayList<>();
            if (result.getOptimumFound()) {
                Iterator<String[]> results = result.getOutput().iterator();
                results.next(); // Skip the header
                results.forEachRemaining(a -> attributes.addAll(Arrays.stream(a).toList()));
            } else request.getData().forEach(d -> attributes.add(d.getValue()));
            return Response.ok().entity(Json.from(attributes)).build();
        } catch (Exception e) {
            throw new ArxletException(e.getMessage(), e);
        }
    }
}
