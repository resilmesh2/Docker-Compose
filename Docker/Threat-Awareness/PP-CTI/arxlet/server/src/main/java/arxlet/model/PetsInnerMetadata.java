/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;

import arxlet.model.KAnonMetadata;
import arxlet.model.KMapMetadata;
import arxlet.model.LDivMetadata;
import arxlet.model.RCLDivMetadata;
import arxlet.model.TCloMetadata;
import com.fasterxml.jackson.annotation.JsonTypeName;
import java.util.ArrayList;
import java.util.List;

import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("Pets_inner_metadata")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class PetsInnerMetadata   {
  private Integer k;
  private String attribute;
  private Integer l;
  private Double c;
  private Double t;
  private List<List<ObjectDataInner>> context;

  /**
   * If the scheme is k-anonymity, describes the value of k
   **/
  public PetsInnerMetadata k(Integer k) {
    this.k = k;
    return this;
  }

  
  @JsonProperty("k")
  public Integer getK() {
    return k;
  }

  @JsonProperty("k")
  public void setK(Integer k) {
    this.k = k;
  }

  /**
   * If the scheme applies to a sensitive attribute, describes the attribute name
   **/
  public PetsInnerMetadata attribute(String attribute) {
    this.attribute = attribute;
    return this;
  }

  
  @JsonProperty("attribute")
  public String getAttribute() {
    return attribute;
  }

  @JsonProperty("attribute")
  public void setAttribute(String attribute) {
    this.attribute = attribute;
  }

  /**
   * If the scheme is l-diversity, describes the value of l
   **/
  public PetsInnerMetadata l(Integer l) {
    this.l = l;
    return this;
  }

  
  @JsonProperty("l")
  public Integer getL() {
    return l;
  }

  @JsonProperty("l")
  public void setL(Integer l) {
    this.l = l;
  }

  /**
   * If the scheme is recursive (c, l)-diversity, describes the value of c
   **/
  public PetsInnerMetadata c(Double c) {
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

  /**
   * If the scheme is t-closeness, describes the value of t
   **/
  public PetsInnerMetadata t(Double t) {
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

  /**
   * If the scheme is k-map, contains the object set&#39;s context collection
   **/
  public PetsInnerMetadata context(List<List<ObjectDataInner>> context) {
    this.context = context;
    return this;
  }

  
  @JsonProperty("context")
  public List<List<ObjectDataInner>> getContext() {
    return context;
  }

  @JsonProperty("context")
  public void setContext(List<List<ObjectDataInner>> context) {
    this.context = context;
  }


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    PetsInnerMetadata petsInnerMetadata = (PetsInnerMetadata) o;
    return Objects.equals(this.k, petsInnerMetadata.k) &&
        Objects.equals(this.attribute, petsInnerMetadata.attribute) &&
        Objects.equals(this.l, petsInnerMetadata.l) &&
        Objects.equals(this.c, petsInnerMetadata.c) &&
        Objects.equals(this.t, petsInnerMetadata.t) &&
        Objects.equals(this.context, petsInnerMetadata.context);
  }

  @Override
  public int hashCode() {
    return Objects.hash(k, attribute, l, c, t, context);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class PetsInnerMetadata {\n");
    
    sb.append("    k: ").append(toIndentedString(k)).append("\n");
    sb.append("    attribute: ").append(toIndentedString(attribute)).append("\n");
    sb.append("    l: ").append(toIndentedString(l)).append("\n");
    sb.append("    c: ").append(toIndentedString(c)).append("\n");
    sb.append("    t: ").append(toIndentedString(t)).append("\n");
    sb.append("    context: ").append(toIndentedString(context)).append("\n");
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

