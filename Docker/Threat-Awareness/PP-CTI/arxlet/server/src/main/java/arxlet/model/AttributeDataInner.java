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



@JsonTypeName("AttributeData_inner")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class AttributeDataInner   {
  private String value;
  private List<String> hierarchies = new ArrayList<>();

  /**
   * The attribute&#39;s value
   **/
  public AttributeDataInner value(String value) {
    this.value = value;
    return this;
  }

  
  @JsonProperty("value")
  public String getValue() {
    return value;
  }

  @JsonProperty("value")
  public void setValue(String value) {
    this.value = value;
  }

  /**
   **/
  public AttributeDataInner hierarchies(List<String> hierarchies) {
    this.hierarchies = hierarchies;
    return this;
  }

  
  @JsonProperty("hierarchies")
  public List<String> getHierarchies() {
    return hierarchies;
  }

  @JsonProperty("hierarchies")
  public void setHierarchies(List<String> hierarchies) {
    this.hierarchies = hierarchies;
  }

  public AttributeDataInner addHierarchiesItem(String hierarchiesItem) {
    if (this.hierarchies == null) {
      this.hierarchies = new ArrayList<>();
    }

    this.hierarchies.add(hierarchiesItem);
    return this;
  }

  public AttributeDataInner removeHierarchiesItem(String hierarchiesItem) {
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
    AttributeDataInner attributeDataInner = (AttributeDataInner) o;
    return Objects.equals(this.value, attributeDataInner.value) &&
        Objects.equals(this.hierarchies, attributeDataInner.hierarchies);
  }

  @Override
  public int hashCode() {
    return Objects.hash(value, hierarchies);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class AttributeDataInner {\n");
    
    sb.append("    value: ").append(toIndentedString(value)).append("\n");
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

