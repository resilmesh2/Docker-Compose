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



@JsonTypeName("VersionResponse")
@jakarta.annotation.Generated(value = "org.openapitools.codegen.languages.JavaJAXRSSpecServerCodegen", date = "2024-03-22T16:47:17.052965031+01:00[Europe/Madrid]")
public class VersionResponse   {
  private String version;
  private Integer major;
  private Integer minor;

  /**
   * The complete ARXlet version string
   **/
  public VersionResponse version(String version) {
    this.version = version;
    return this;
  }

  
  @JsonProperty("version")
  public String getVersion() {
    return version;
  }

  @JsonProperty("version")
  public void setVersion(String version) {
    this.version = version;
  }

  /**
   * The major version
   **/
  public VersionResponse major(Integer major) {
    this.major = major;
    return this;
  }

  
  @JsonProperty("major")
  public Integer getMajor() {
    return major;
  }

  @JsonProperty("major")
  public void setMajor(Integer major) {
    this.major = major;
  }

  /**
   * The minor version
   **/
  public VersionResponse minor(Integer minor) {
    this.minor = minor;
    return this;
  }

  
  @JsonProperty("minor")
  public Integer getMinor() {
    return minor;
  }

  @JsonProperty("minor")
  public void setMinor(Integer minor) {
    this.minor = minor;
  }


  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    VersionResponse versionResponse = (VersionResponse) o;
    return Objects.equals(this.version, versionResponse.version) &&
        Objects.equals(this.major, versionResponse.major) &&
        Objects.equals(this.minor, versionResponse.minor);
  }

  @Override
  public int hashCode() {
    return Objects.hash(version, major, minor);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class VersionResponse {\n");
    
    sb.append("    version: ").append(toIndentedString(version)).append("\n");
    sb.append("    major: ").append(toIndentedString(major)).append("\n");
    sb.append("    minor: ").append(toIndentedString(minor)).append("\n");
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

