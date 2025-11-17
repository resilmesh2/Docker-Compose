/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;

import arxlet.model.ObjectDataInner;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("KMapMetadata")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class KMapMetadata   {
  private Object k = null;
  private List<List<ObjectDataInner>> context = new ArrayList<>();

  /**
   * If the scheme is k-anonymity, describes the value of k
   **/
  public KMapMetadata k(Object k) {
    this.k = k;
    return this;
  }

  
  @JsonProperty("k")
  public Object getK() {
    return k;
  }

  @JsonProperty("k")
  public void setK(Object k) {
    this.k = k;
  }

  /**
   * If the scheme is k-map, contains the object set&#39;s context collection
   **/
  public KMapMetadata context(List<List<ObjectDataInner>> context) {
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

  public KMapMetadata addContextItem(List<ObjectDataInner> contextItem) {
    if (this.context == null) {
      this.context = new ArrayList<>();
    }

    this.context.add(contextItem);
    return this;
  }

  public KMapMetadata removeContextItem(List<ObjectDataInner> contextItem) {
    if (contextItem != null && this.context != null) {
      this.context.remove(contextItem);
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
    KMapMetadata kmapMetadata = (KMapMetadata) o;
    return Objects.equals(this.k, kmapMetadata.k) &&
        Objects.equals(this.context, kmapMetadata.context);
  }

  @Override
  public int hashCode() {
    return Objects.hash(k, context);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class KMapMetadata {\n");
    
    sb.append("    k: ").append(toIndentedString(k)).append("\n");
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

