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



@JsonTypeName("TCloMetadata")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class TCloMetadata   {
  private Object attribute = null;
  private Double t;

  /**
   * If the scheme applies to a sensitive attribute, describes the attribute name
   **/
  public TCloMetadata attribute(Object attribute) {
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
   * If the scheme is t-closeness, describes the value of t
   **/
  public TCloMetadata t(Double t) {
    this.t = t;
    return this;
  }

  
  @JsonProperty("t")
  public Double getT() {
    return t;
  }

  @JsonProperty("t")
  public void setT(Double t) {
    this.t = t;
  }


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    TCloMetadata tcloMetadata = (TCloMetadata) o;
    return Objects.equals(this.attribute, tcloMetadata.attribute) &&
        Objects.equals(this.t, tcloMetadata.t);
  }

  @Override
  public int hashCode() {
    return Objects.hash(attribute, t);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class TCloMetadata {\n");
    
    sb.append("    attribute: ").append(toIndentedString(attribute)).append("\n");
    sb.append("    t: ").append(toIndentedString(t)).append("\n");
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

