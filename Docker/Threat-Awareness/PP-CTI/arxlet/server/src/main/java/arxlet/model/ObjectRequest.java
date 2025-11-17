/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU).
 *
 * See LICENSE file in the project root for details.
 */

package arxlet.model;

import arxlet.model.ObjectDataInner;
import arxlet.model.PetsInner;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import java.util.Objects;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonTypeName;



@JsonTypeName("ObjectRequest")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class ObjectRequest   {
  private List<ObjectDataInner> data = new ArrayList<>();
  private List<PetsInner> pets = new ArrayList<>();

  /**
   **/
  public ObjectRequest data(List<ObjectDataInner> data) {
    this.data = data;
    return this;
  }

  
  @JsonProperty("data")
  public List<ObjectDataInner> getData() {
    return data;
  }

  @JsonProperty("data")
  public void setData(List<ObjectDataInner> data) {
    this.data = data;
  }

  public ObjectRequest addDataItem(ObjectDataInner dataItem) {
    if (this.data == null) {
      this.data = new ArrayList<>();
    }

    this.data.add(dataItem);
    return this;
  }

  public ObjectRequest removeDataItem(ObjectDataInner dataItem) {
    if (dataItem != null && this.data != null) {
      this.data.remove(dataItem);
    }

    return this;
  }
  /**
   **/
  public ObjectRequest pets(List<PetsInner> pets) {
    this.pets = pets;
    return this;
  }

  
  @JsonProperty("pets")
  public List<PetsInner> getPets() {
    return pets;
  }

  @JsonProperty("pets")
  public void setPets(List<PetsInner> pets) {
    this.pets = pets;
  }

  public ObjectRequest addPetsItem(PetsInner petsItem) {
    if (this.pets == null) {
      this.pets = new ArrayList<>();
    }

    this.pets.add(petsItem);
    return this;
  }

  public ObjectRequest removePetsItem(PetsInner petsItem) {
    if (petsItem != null && this.pets != null) {
      this.pets.remove(petsItem);
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
    ObjectRequest objectRequest = (ObjectRequest) o;
    return Objects.equals(this.data, objectRequest.data) &&
        Objects.equals(this.pets, objectRequest.pets);
  }

  @Override
  public int hashCode() {
    return Objects.hash(data, pets);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class ObjectRequest {\n");
    
    sb.append("    data: ").append(toIndentedString(data)).append("\n");
    sb.append("    pets: ").append(toIndentedString(pets)).append("\n");
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

