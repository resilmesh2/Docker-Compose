/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;

import arxlet.model.ObjectDataInnerHierarchiesInner;
import arxlet.model.ObjectInner;
import com.fasterxml.jackson.annotation.JsonTypeName;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("ObjectData_inner")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class ObjectDataInner   {
  private List<ObjectInner> values = new ArrayList<>();
  private List<ObjectDataInnerHierarchiesInner> hierarchies = new ArrayList<>();

  /**
   **/
  public ObjectDataInner values(List<ObjectInner> values) {
    this.values = values;
    return this;
  }

  
  @JsonProperty("values")
  public List<ObjectInner> getValues() {
    return values;
  }

  @JsonProperty("values")
  public void setValues(List<ObjectInner> values) {
    this.values = values;
  }

  public ObjectDataInner addValuesItem(ObjectInner valuesItem) {
    if (this.values == null) {
      this.values = new ArrayList<>();
    }

    this.values.add(valuesItem);
    return this;
  }

  public ObjectDataInner removeValuesItem(ObjectInner valuesItem) {
    if (valuesItem != null && this.values != null) {
      this.values.remove(valuesItem);
    }

    return this;
  }
  /**
   **/
  public ObjectDataInner hierarchies(List<ObjectDataInnerHierarchiesInner> hierarchies) {
    this.hierarchies = hierarchies;
    return this;
  }

  
  @JsonProperty("hierarchies")
  public List<ObjectDataInnerHierarchiesInner> getHierarchies() {
    return hierarchies;
  }

  @JsonProperty("hierarchies")
  public void setHierarchies(List<ObjectDataInnerHierarchiesInner> hierarchies) {
    this.hierarchies = hierarchies;
  }

  public ObjectDataInner addHierarchiesItem(ObjectDataInnerHierarchiesInner hierarchiesItem) {
    if (this.hierarchies == null) {
      this.hierarchies = new ArrayList<>();
    }

    this.hierarchies.add(hierarchiesItem);
    return this;
  }

  public ObjectDataInner removeHierarchiesItem(ObjectDataInnerHierarchiesInner hierarchiesItem) {
    if (hierarchiesItem != null && this.hierarchies != null) {
      this.hierarchies.remove(hierarchiesItem);
    }

    return this;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    ObjectDataInner objectDataInner = (ObjectDataInner) o;
    return Objects.equals(this.values, objectDataInner.values) &&
        Objects.equals(this.hierarchies, objectDataInner.hierarchies);
  }

  @Override
  public int hashCode() {
    return Objects.hash(values, hierarchies);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class ObjectDataInner {\n");
    
    sb.append("    values: ").append(toIndentedString(values)).append("\n");
    sb.append("    hierarchies: ").append(toIndentedString(hierarchies)).append("\n");
    sb.append("}");
    return sb.toString();
  }

  /**
   * Convert the given object to string with each line indented by 4 spaces
   * (except the first line).
   */
  private String toIndentedString(Object o) {
    if (o == null) {
      return "null";
    }
    return o.toString().replace("\n", "\n    ");
  }


}

