/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;


import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("RCLDivMetadata")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class RCLDivMetadata   {
  private Object attribute = null;
  private Object l = null;
  private Double c;

  /**
   * If the scheme applies to a sensitive attribute, describes the attribute name
   **/
  public RCLDivMetadata attribute(Object attribute) {
    this.attribute = attribute;
    return this;
  }

  
  @JsonProperty("attribute")
  public Object getAttribute() {
    return attribute;
  }

  @JsonProperty("attribute")
  public void setAttribute(Object attribute) {
    this.attribute = attribute;
  }

  /**
   * If the scheme is l-diversity, describes the value of l
   **/
  public RCLDivMetadata l(Object l) {
    this.l = l;
    return this;
  }

  
  @JsonProperty("l")
  public Object getL() {
    return l;
  }

  @JsonProperty("l")
  public void setL(Object l) {
    this.l = l;
  }

  /**
   * If the scheme is recursive (c, l)-diversity, describes the value of c
   **/
  public RCLDivMetadata c(Double c) {
    this.c = c;
    return this;
  }

  
  @JsonProperty("c")
  public Double getC() {
    return c;
  }

  @JsonProperty("c")
  public void setC(Double c) {
    this.c = c;
  }


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    RCLDivMetadata rcLDivMetadata = (RCLDivMetadata) o;
    return Objects.equals(this.attribute, rcLDivMetadata.attribute) &&
        Objects.equals(this.l, rcLDivMetadata.l) &&
        Objects.equals(this.c, rcLDivMetadata.c);
  }

  @Override
  public int hashCode() {
    return Objects.hash(attribute, l, c);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class RCLDivMetadata {\n");
    
    sb.append("    attribute: ").append(toIndentedString(attribute)).append("\n");
    sb.append("    l: ").append(toIndentedString(l)).append("\n");
    sb.append("    c: ").append(toIndentedString(c)).append("\n");
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

