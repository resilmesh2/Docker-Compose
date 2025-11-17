/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;

import com.fasterxml.jackson.annotation.JsonTypeName;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("ObjectData_inner_hierarchies_inner")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class ObjectDataInnerHierarchiesInner   {
  private String type;
  private List<String> values = new ArrayList<>();

  /**
   **/
  public ObjectDataInnerHierarchiesInner type(String type) {
    this.type = type;
    return this;
  }

  
  @JsonProperty("type")
  public String getType() {
    return type;
  }

  @JsonProperty("type")
  public void setType(String type) {
    this.type = type;
  }

  /**
   **/
  public ObjectDataInnerHierarchiesInner values(List<String> values) {
    this.values = values;
    return this;
  }

  
  @JsonProperty("values")
  public List<String> getValues() {
    return values;
  }

  @JsonProperty("values")
  public void setValues(List<String> values) {
    this.values = values;
  }

  public ObjectDataInnerHierarchiesInner addValuesItem(String valuesItem) {
    if (this.values == null) {
      this.values = new ArrayList<>();
    }

    this.values.add(valuesItem);
    return this;
  }

  public ObjectDataInnerHierarchiesInner removeValuesItem(String valuesItem) {
    if (valuesItem != null && this.values != null) {
      this.values.remove(valuesItem);
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
    ObjectDataInnerHierarchiesInner objectDataInnerHierarchiesInner = (ObjectDataInnerHierarchiesInner) o;
    return Objects.equals(this.type, objectDataInnerHierarchiesInner.type) &&
        Objects.equals(this.values, objectDataInnerHierarchiesInner.values);
  }

  @Override
  public int hashCode() {
    return Objects.hash(type, values);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class ObjectDataInnerHierarchiesInner {\n");
    
    sb.append("    type: ").append(toIndentedString(type)).append("\n");
    sb.append("    values: ").append(toIndentedString(values)).append("\n");
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

