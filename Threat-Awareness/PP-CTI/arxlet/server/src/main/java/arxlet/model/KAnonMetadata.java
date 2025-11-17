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



@JsonTypeName("KAnonMetadata")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class KAnonMetadata   {
  private Integer k;

  /**
   * If the scheme is k-anonymity, describes the value of k
   **/
  public KAnonMetadata k(Integer k) {
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


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    KAnonMetadata kanonMetadata = (KAnonMetadata) o;
    return Objects.equals(this.k, kanonMetadata.k);
  }

  @Override
  public int hashCode() {
    return Objects.hash(k);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class KAnonMetadata {\n");
    
    sb.append("    k: ").append(toIndentedString(k)).append("\n");
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

