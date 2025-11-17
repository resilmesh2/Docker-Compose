/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;

import arxlet.model.PetsInnerMetadata;
import com.fasterxml.jackson.annotation.JsonTypeName;

import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("Pets_inner")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class PetsInner   {
  private String scheme;
  private PetsInnerMetadata metadata;

  /**
   * The PET schema, indicates the PPT to apply.
   **/
  public PetsInner scheme(String scheme) {
    this.scheme = scheme;
    return this;
  }

  
  @JsonProperty("scheme")
  public String getScheme() {
    return scheme;
  }

  @JsonProperty("scheme")
  public void setScheme(String scheme) {
    this.scheme = scheme;
  }

  /**
   **/
  public PetsInner metadata(PetsInnerMetadata metadata) {
    this.metadata = metadata;
    return this;
  }

  
  @JsonProperty("metadata")
  public PetsInnerMetadata getMetadata() {
    return metadata;
  }

  @JsonProperty("metadata")
  public void setMetadata(PetsInnerMetadata metadata) {
    this.metadata = metadata;
  }


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    PetsInner petsInner = (PetsInner) o;
    return Objects.equals(this.scheme, petsInner.scheme) &&
        Objects.equals(this.metadata, petsInner.metadata);
  }

  @Override
  public int hashCode() {
    return Objects.hash(scheme, metadata);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class PetsInner {\n");
    
    sb.append("    scheme: ").append(toIndentedString(scheme)).append("\n");
    sb.append("    metadata: ").append(toIndentedString(metadata)).append("\n");
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

