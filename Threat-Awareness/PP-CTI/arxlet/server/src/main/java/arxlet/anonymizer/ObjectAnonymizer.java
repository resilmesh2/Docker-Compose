/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.anonymizer;

import arxlet.model.*;
import arxlet.util.Json;
import jakarta.ws.rs.core.Response;
import org.deidentifier.arx.*;
import org.deidentifier.arx.criteria.*;

import java.util.*;
import java.util.stream.IntStream;

public class ObjectAnonymizer extends Anonymizer {

    public static Response anonymize(ObjectRequest request) throws ArxletException {
        ARXAnonymizer anonymizer = new ARXAnonymizer();
        Data.DefaultData data = Data.DefaultData.create();
        ARXConfiguration config = ARXConfiguration.create();

        // Error checking
        if (request.getData().size() <= 1) throw new ArxletException(String.format("Not enough data in request: %s <= 1", request.getData().size()));
        if (request.getPets().isEmpty()) throw new ArxletException("Not enough PETs in request: need at least 1");

        // We have to figure out the attribute types first by inspecting the first object
        // TODO This naive first implementation will assume that all objects contain all attributes. In the future, a
        //  more robust implementation should account for missing attributes and calculate default values (probably just
        //  the highest level of generalization/suppression in the hierarchy)
        List<String> attributeNames = request.getData().getFirst().getValues().stream()
                .map(ObjectInner::getType)
                .toList();

        if (attributeNames.isEmpty()) {
            throw new ArxletException("Unable to determine attribute names: first object contains no attributes");
        }

        Map<String, AttributeType.Hierarchy.DefaultHierarchy> attributeHierarchies = new HashMap<>();
        request.getData().stream().flatMap(o -> o.getHierarchies().stream()).forEach(h -> {
            attributeHierarchies.putIfAbsent(h.getType(), AttributeType.Hierarchy.DefaultHierarchy.create());
            attributeHierarchies.get(h.getType()).add(h.getValues().toArray(new String[0]));
        });

        data.add(attributeNames.toArray(new String[0]));
        for (String attributeName : attributeNames) {
            data.getDefinition().setDataType(attributeName, DataType.STRING);
            data.getDefinition().setAttributeType(attributeName, attributeHierarchies.get(attributeName));
        }

        ObjectAnonymizer.prepareData(data, attributeNames, request.getData());

        for (PetsInner p : request.getPets()) {
            switch (p.getScheme().toLowerCase()) {
                case "k-anonymity" -> {
                    if (p.getMetadata().getK() > request.getData().size())
                        return Response.status(400).build();
                    config.addPrivacyModel(new KAnonymity(p.getMetadata().getK()));
                }
                case "l-diversity/distinct" -> {
                    if (p.getMetadata().getL() > request.getData().size())
                        return Response.status(400).build();
                    config.addPrivacyModel(new DistinctLDiversity(p.getMetadata().getAttribute(), p.getMetadata().getL()));
                }
                case "l-diversity/entropy" -> {
                    if (p.getMetadata().getL() > request.getData().size())
                        return Response.status(400).build();
                    config.addPrivacyModel(new EntropyLDiversity(p.getMetadata().getAttribute(), p.getMetadata().getL()));
                }
                case "l-diversity/recursive" -> {
                    if (p.getMetadata().getL() > request.getData().size())
                        return Response.status(400).build();
                    config.addPrivacyModel(new RecursiveCLDiversity(p.getMetadata().getAttribute(), p.getMetadata().getC(), p.getMetadata().getL()));
                }
                case "t-closeness/hierarchical" -> config.addPrivacyModel(new HierarchicalDistanceTCloseness(p.getMetadata().getAttribute(), p.getMetadata().getT(), attributeHierarchies.get(p.getMetadata().getAttribute())));
                case "t-closeness/ordered" -> config.addPrivacyModel(new OrderedDistanceTCloseness(p.getMetadata().getAttribute(), p.getMetadata().getT()));
                case "k-map" -> {
                    Data.DefaultData contextDataContainer = Data.DefaultData.create();
                    List<ObjectDataInner> contextData = new ArrayList<>(request.getData());
                    for (var l : p.getMetadata().getContext()) contextData.addAll(l);
                    contextDataContainer.add(attributeNames.toArray(new String[0]));
                    ObjectAnonymizer.prepareData(contextDataContainer, attributeNames, contextData);
                    config.addPrivacyModel(new KMap(p.getMetadata().getK(), DataSubset.create(contextDataContainer, data)));
                }
            }
        }

        try {
            ARXResult result = anonymizer.anonymize(data, config);
            List<List<ObjectAnonymizedInner>> objects = new ArrayList<>();
            if (result.getOptimumFound()) {
                Iterator<String[]> results = result.getOutput().iterator();
                results.next(); // Skip the header
                results.forEachRemaining(r -> {
                    List<ObjectAnonymizedInner> o = IntStream.range(0, r.length)
                            .mapToObj(i -> new ObjectAnonymizedInner().type(attributeNames.get(i)).value(r[i]))
                            .toList();
                    objects.add(o);
                });
            } else {
                request.getData().forEach(obj -> {
                    List<ObjectAnonymizedInner> o = obj.getValues().stream()
                            .map(oi -> new ObjectAnonymizedInner().type(oi.getType()).value(oi.getValue()))
                            .toList();
                    objects.add(o);
                });
            }
            return Response.ok().entity(Json.from(objects)).build();
        } catch (Exception e) {
            throw new ArxletException(e.getMessage(), e);
        }
    }

    public static void prepareData(Data.DefaultData dataContainer, List<String> attributeNames, List<ObjectDataInner> data) throws ArxletException {
        int objectIndex = 0;
        for (ObjectDataInner d : data) {
            if (d.getValues().size() != attributeNames.size())
                throw new ArxletException(String.format("Object at index %s has mismatched attribute count: %s != %s", objectIndex, d.getValues().size(), attributeNames.size()));
            if (d.getValues().size() != d.getHierarchies().size())
                throw new ArxletException(String.format("Object at index %s has mismatching attribute/hierarchies count: %s != %s", objectIndex, d.getValues().size(), d.getHierarchies().size()));
            String[] row = new String[attributeNames.size()];
            int attributeIndex = 0;
            for (ObjectInner a : d.getValues()) {
                if (a.getType() == null)
                    throw new ArxletException(String.format("Attribute at index %s from object at index %s is missing a 'type' field", attributeIndex, objectIndex));
                if (a.getValue() == null)
                    throw new ArxletException(String.format("Attribute at index %s of type '%s' from object at index %s is missing a 'type' field", attributeIndex, a.getType(), objectIndex));
                int index = attributeNames.indexOf(a.getType());
                if (index == -1) throw new ArxletException(String.format("Unknown attribute type '%s'", a.getType()));
                row[index] = a.getValue();
                attributeIndex++;
            }
            dataContainer.add(row);
            objectIndex++;
        }
    }
}
