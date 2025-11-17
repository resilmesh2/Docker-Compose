/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
 *
 * See LICENSE file in the project root for details.
 */

import { useState, useImperativeHandle, forwardRef } from "react";
import { v4 as uuidv4 } from "uuid";

const Hierarchy = forwardRef(({ onGenerateHierarchy }, ref) => {
  const needhierarchy = [
    "quasi",
    "t-clos-hierachical",
    "suppression",
    "generalization",
    "quasi/k-anonymity",
  ];
  const needalsolevel = ["suppression", "generalization"];

  //seted on file read
  const [flagatt, setFlagatt] = useState(false);
  const [flagobj, setFlagobj] = useState(false);

  //retrieved on file read
  const [attribute_list, setAttribute_list] = useState([]);
  const [object_list, setObject_list] = useState([]);
  //for level checking
  const [attribute_level_list, setAttribute_level_list] = useState([]);
  const [object_level_list, setObject_level_list] = useState([]);

  const [hattributes, setHattributes] = useState([
    { name: "", type: "", hierarchies: [""] },
  ]);
  const [hobjects, setHobjects] = useState([
    { name: "", attributes: [{ name: "", type: "", hierarchies: [""] }] },
  ]);
  const [creator, setCreator] = useState("");
  const [organization, setOrganization] = useState("");
  const [version, setVersion] = useState("");

  const [filename, setFilename] = useState("");

  // Exponer la función para que pueda ser llamada desde App.js
  useImperativeHandle(ref, () => ({
    triggerHierarchyGeneration: () => handleSubmit(),
  }));

  const handleCreator = (event) => {
    setCreator(event.target.value);
  };

  const handleOrganization = (event) => {
    setOrganization(event.target.value);
  };

  const handleVersion = (event) => {
    setVersion(event.target.value);
  };

  const addAttribute = () => {
    let atbs = [...hattributes];
    atbs.push({ name: "", type: "", hierarchies: [""] });
    setHattributes(atbs);
  };

  const removeAttribute = (index) => {
    let atbs = [...hattributes];
    atbs.splice(index, 1);
    setHattributes(atbs);
  };

  const handleChangeAttributeName = (event, index) => {
    let name = event.target.value;
    let atbs = [...hattributes];
    let names = atbs.map((a) => a.name);
    if (names.includes(name)) {
      alert("Only 1 policy per attribute");
    } else {
      let att = atbs[index];
      att.name = name;
      att.type = "";
      att.hierarchies = [""];
      setHattributes(atbs);
    }
  };

  const handleChangeAttributeType = (event, index) => {
    let type = event.target.value;
    let atbs = [...hattributes];
    let att = atbs[index];
    att.type = type;
    setHattributes(atbs);
  };

  const handleChangeAttributeHierarchy = (event, index, index_h) => {
    let hierarchyvalue = event.target.value;
    let atbs = [...hattributes];
    atbs[index].hierarchies[index_h] = hierarchyvalue;
    setHattributes(atbs);
  };

  const handleAddAttributeHierarchy = (index, index_h) => {
    let atbs = [...hattributes];
    atbs[index].hierarchies.splice(index_h + 1, 0, "");
    setHattributes(atbs);
  };

  const handleRemoveAttributeHierarchy = (index, index_h) => {
    let atbs = [...hattributes];
    atbs[index].hierarchies.splice(index_h, 1);
    setHattributes(atbs);
  };

  const addObject = () => {
    let objs = [...hobjects];
    objs.push({
      name: "",
      attributes: [{ name: "", type: "", hierarchies: [""] }],
    });
    setHobjects(objs);
  };

  const removeObject = (index) => {
    let objs = [...hobjects];
    objs.splice(index, 1);
    setHobjects(objs);
  };

  const addObjectAttribute = (index_o, index_a) => {
    let objs = [...hobjects];
    let atbs = objs[index_o].attributes;
    atbs.splice(index_a + 1, 0, { name: "", type: "", hierarchies: [""] });
    setHobjects(objs);
  };

  const removeObjectAttribute = (index_o, index_a) => {
    let objs = [...hobjects];
    let atbs = objs[index_o].attributes;
    atbs.splice(index_a, 1);
    setHobjects(objs);
  };

  const handleChangeObjectName = (event, index) => {
    let name = event.target.value;
    let objs = [...hobjects];
    let names = objs.map((el) => el.name);
    if (names.includes(name)) {
      alert("Only 1 hierarchy policy per object");
    } else {
      objs[index].name = name;
      setHobjects(objs);
    }
  };

  const handleChangeObjectAttributeName = (event, index_o, index_a) => {
    let name = event.target.value;
    let objs = [...hobjects];
    let names = objs[index_o].attributes.map((el) => el.name);
    if (names.includes(name)) {
      alert("Only 1 hierarchy policy per attribute");
    } else {
      let att = (objs[index_o].attributes[index_a].name = name);
      setHobjects(objs);
    }
  };

  const handleChangeObjectAttributeType = (event, index_o, index_a) => {
    let type = event.target.value;
    let objs = [...hobjects];
    let att = (objs[index_o].attributes[index_a].type = type);
    setHobjects(objs);
  };

  const handleChangeObjectAttributeHierarchy = (
    event,
    index_o,
    index_a,
    index_h
  ) => {
    let hierarchy = event.target.value;
    let objs = [...hobjects];
    objs[index_o].attributes[index_a].hierarchies[index_h] = hierarchy;
    setHobjects(objs);
  };

  const handleAddObjectAttributeHierarchy = (index_o, index_a, index_h) => {
    let objs = [...hobjects];
    objs[index_o].attributes[index_a].hierarchies.splice(index_h + 1, 0, "");
    setHobjects(objs);
  };

  const handleRemoveObjectAttributeHierarchy = (index_o, index_a, index_h) => {
    let objs = [...hobjects];
    objs[index_o].attributes[index_a].hierarchies.splice(index_h, 1);
    setHobjects(objs);
  };

  let fileReader;
  const handleFisleChosen = (file) => {
    if (file != null) {
      fileReader = new FileReader();
      fileReader.onloadend = function () {
        const content = fileReader.result;
        console.log(content);
        try {
          //parsear evento
          let parseTojson = JSON.parse(content);
          console.log(content);
          let attributes = parseTojson["Privacy-policy"]["attributes"];
          console.log(attributes);
          let objects = parseTojson["Privacy-policy"]["templates"];
          if (attributes !== undefined && attributes.length > 0) {
            if (flagobj) {
              setFlagobj(false);
              setObject_list([]);
              setHobjects([
                {
                  name: "",
                  attributes: [{ name: "", type: "", hierarchies: [""] }],
                },
              ]);
            }
            console.log("attributes");
            let att_list = [];
            attributes.forEach((attribute) => {
              if (!att_list.includes(attribute["name"])) {
                let pet = attribute.pets[0];
                if (needhierarchy.includes(pet.scheme))
                  att_list.push(attribute.name);
                //att_list.push(attribute.name)
              }
              if (needalsolevel.includes(attribute.pets[0].scheme)) {
                attribute_level_list.push({
                  name: attribute.name,
                  level: attribute.pets[0].metadata.level,
                });
              }
            });
            setAttribute_list(att_list);
            setFlagatt(true);
            setFilename(file.name);
          } else if (objects !== undefined && objects.length > 0) {
            if (flagatt) {
              setFlagatt(false);
              setAttribute_list([]);
              setHattributes([{ name: "", type: "", hierarchies: [""] }]);
            }
            console.log("object list");
            let obj_list = [];
            objects.forEach((object) => {
              if (!obj_list.some((o) => o.name === object.name)) {
                // obj_list.push({"name": object.name, "attributes": []});
                obj_list.push(object);
                console.log("push " + object.name);
              }
              object.attributes.forEach((attribute) => {
                let obj = obj_list.find((el) => {
                  return el.name === object.name;
                });
                if (!obj.attributes.includes(attribute.name)) {
                  let pet = attribute.pets[0];
                  if (needhierarchy.includes(pet.scheme)) {
                    console.log("push " + attribute.name);
                    obj.attributes.push(attribute.name);
                  }
                }
              });
            });
            setObject_list(obj_list);
            console.log(`Set object list`);
            console.log(obj_list);
            setFlagobj(true);
            setFilename(file.name);
          }
        } catch (error) {
          alert("policy file not correct");
        }
      };
      fileReader.onerror = errorfile;
      fileReader.readAsText(file);
    }
  };

  const errorfile = () => {
    console.log("error reading file");
  };

  const handleSubmit = (e) => {
    return new Promise((resolve, reject) => {
      // e.preventDefault()
      e?.preventDefault();
      if (filename === "") {
        alert("Couldnt generate hierarchy over no policy file");
        return;
      }
      console.log(attribute_list);
      console.log(object_list);
      let uuid = uuidv4();
      let policy = {};
      policy["hierarchy-description"] =
        "This hierarchy policy was generated with PP-CTI's frontend.";
      policy.creator = creator;
      policy.organization = organization;
      policy.version = version;
      policy.uuid = uuid;
      if (flagatt) {
        let hierarchy_attributes = [];
        for (let atth of hattributes) {
          let ha = {};
          ha["attribute-name"] = atth.name;
          ha["attribute-type"] = atth.type;
          switch (atth.type) {
            case "static":
              let hierarchies = [];
              for (let h of atth.hierarchies) {
                let strings = h.split(",");
                //hierarchies.push({"generalization": strings})
                hierarchies.push({
                  generalization: strings,
                  interval: [],
                  regex: [],
                });
              }
              ha["attribute-generalization"] = hierarchies;
              break;
            case "regex":
              let h1 = atth.hierarchies[0];
              let strings = h1.split(",");
              //ha['attribute-generalization'] = [{"regex": strings}]
              ha["attribute-generalization"] = [
                { generalization: [], interval: [], regex: strings },
              ];
              break;
            case "interval":
              let interval_hierarchies = [];
              for (let h of atth.hierarchies) {
                let strings = h.split(",");
                //interval_hierarchies.push({"interval": strings})
                interval_hierarchies.push({
                  generalization: [],
                  interval: strings,
                  regex: [],
                });
              }
              ha["attribute-generalization"] = interval_hierarchies;
              break;
            case "None":
              alert("Hierarchy type cannot be None");
              reject("Hierarchy type cannot be None");
              break;
          }
          hierarchy_attributes.push(ha);
        }
        policy["hierarchy_attributes"] = hierarchy_attributes;
        policy["hierarchy_objects"] = [];
        let hierarchy_policy = { "Hierarchy-policy": policy };
        console.log(JSON.stringify(hierarchy_policy));
        //para pasar el fichero de jerarquías al App.js
        onGenerateHierarchy(JSON.stringify(hierarchy_policy));
        //download file
        const url = window.URL.createObjectURL(
          new Blob([JSON.stringify(hierarchy_policy)])
        );
        const link = document.createElement("a");
        link.href = url;
        let nameoffile = filename;
        nameoffile = nameoffile.replace(".json", "");
        console.log("file name " + nameoffile);
        link.setAttribute("download", nameoffile + "-hierarchy.json");
        document.body.appendChild(link);
        link.click();
        resolve("");
      } else {
        let hierarchy_objects = [];
        for (let object of hobjects) {
          console.log(`Adding hobject ${object.name} to ret`);
          console.log(object);
          let hierarchyattributes = [];
          for (let attribute of object.attributes) {
            if (attribute.name === "") {
              continue;
            }
            console.log(`Adding hobject.attribute ${attribute.name} to ret`);
            let ha = {};
            ha["attribute-name"] = attribute.name;
            ha["attribute-type"] = attribute.type;
            switch (attribute.type) {
              case "static":
                let hierarchies = [];
                for (let h of attribute.hierarchies) {
                  let strings = h.split(",");
                  //hierarchies.push({"generalization": strings})
                  hierarchies.push({
                    generalization: strings,
                    interval: [],
                    regex: [],
                  });
                }
                ha["attribute-generalization"] = hierarchies;
                break;
              case "regex":
                let h1 = attribute.hierarchies[0];
                let strings = h1.split(",");
                //ha['attribute-generalization'] = [{"regex": strings}]
                ha["attribute-generalization"] = [
                  { generalization: [], interval: [], regex: strings },
                ];
                break;
              case "interval":
                let interval_hierarchies = [];
                for (let h of attribute.hierarchies) {
                  let strings = h.split(",");
                  //interval_hierarchies.push({"interval": strings})
                  interval_hierarchies.push({
                    generalization: [],
                    interval: strings,
                    regex: [],
                  });
                }
                ha["attribute-generalization"] = interval_hierarchies;
                break;
              case "None":
                alert("Hierarchy type cannot be None");
                reject("Hierarchy type cannot be None");
                break;
            }
            hierarchyattributes.push(ha);
          }
          let ho = {
            "misp-object-template": object.name,
            "attribute-hierarchies": hierarchyattributes,
          };
          hierarchy_objects.push(ho);
        }
        policy["hierarchy_objects"] = hierarchy_objects;
        policy["hierarchy_attributes"] = [];
        let hierarchy_policy = { "Hierarchy-policy": policy };
        console.log(JSON.stringify(hierarchy_policy));
        //para pasar el fichero de jerarquias al App.js
        onGenerateHierarchy(JSON.stringify(hierarchy_policy));
        //download file
        const url = window.URL.createObjectURL(
          new Blob([JSON.stringify(hierarchy_policy)])
        );
        const link = document.createElement("a");
        link.href = url;
        let nameoffile = filename;
        nameoffile = nameoffile.replace(".json", "");
        console.log("file name " + nameoffile);
        link.setAttribute("download", nameoffile + "-hierarchy.json");
        document.body.appendChild(link);
        link.click();
        resolve("");
      }
    });
  };

  return (

    <section
      tabIndex={0}
      className="section d-flex flex-column p-3"
      style={{ gap: "3rem" }}
    >

      <div className="container d-flex flex-column align-items-center">

        {/* Label de selección */}
        <div className="d-flex flex-column align-items-center mb-2">
          <label
            htmlFor="policy-file-input"
            className="form-label h5 mb-2 text-center"
          >
              Select privacy policy to process:
          </label>
        </div>

        {/* 1. Input */}
        <div className="w-100 d-flex justify-content-center mb-4">
          <input
            id="policy-file-input"
            type="file"
            accept=".json"
            onChange={(e) => handleFisleChosen(e.target.files[0])}
            className="form-control form-control-sm"
            style={{ maxWidth: 250 }}
          />
        </div>

        <h5 className="text-center mb-4">Hierarchy policy form</h5>

        {/* 2. Fila principal: Org / Creador / Versión / Botón */}
        <form onSubmit={handleSubmit} className="w-100">
          <div className="row justify-content-center align-items-end g-3">
            <div className="col-auto d-flex flex-column align-items-center">
              <label className="form-label">Organization</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="organization"
                required
                onChange={handleOrganization}
              />
            </div>
            <div className="col-auto d-flex flex-column align-items-center">
              <label className="form-label">Creator</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="creator"
                required
                onChange={handleCreator}
              />
            </div>
            <div className="col-auto d-flex flex-column align-items-center">
              <label className="form-label">Version</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="version"
                required
                onChange={handleVersion}
              />
            </div>
          </div>

          {/* Resto del formulario */}
          {(flagatt || flagobj) && (
            <div className="mt-5 d-flex flex-column align-items-center w-100">
              <div className="row ms-2 mt-2 w-100 justify-content-center">
                {flagatt &&
                  hattributes.map((attribute, index) => (
                    <div
                      key={index}
                      className="col-auto d-inline-block mt-2 border border-secondary rounded p-3"
                    >
                      <div className="row">
                        <div className="col-sm">
                          <small className="d-block">Attribute name</small>
                          <select
                            name="attname"
                            value={hattributes[index].name}
                            onChange={(e) => handleChangeAttributeName(e, index)}
                            className="form-select form-select-sm"
                          >
                            <option value="None">None</option>
                            {attribute_list.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-sm">
                          <small className="d-block">Type</small>
                          <select
                            name="atttype"
                            value={hattributes[index].type}
                            onChange={(e) => handleChangeAttributeType(e, index)}
                            className="form-select form-select-sm"
                          >
                            <option value="None">None</option>
                            <option value="static">static</option>
                            <option value="regex">regex</option>
                            <option value="interval">interval</option>
                          </select>
                        </div>
                      </div>
                      <div className="row mt-2">
                        <div className="col-sm">Hierarchies</div>
                      </div>
                      {attribute.hierarchies.map((hierarchy, index_h) => (
                        <div key={index_h}>
                          <div className="row mt-2">
                            <input
                              className="form-control form-control-sm"
                              type="text"
                              placeholder="values separated by commas"
                              required
                              value={hattributes[index].hierarchies[index_h]}
                              onChange={(e) =>
                                handleChangeAttributeHierarchy(e, index, index_h)
                              }
                            />
                          </div>
                          <div className="row mt-1">
                            <div className="col">
                              <button
                                className="btn btn-primary btn-sm me-2"
                                type="button"
                                onClick={() =>
                                  handleAddAttributeHierarchy(index, index_h)
                                }
                              >
                                Add hierarchy
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                type="button"
                                onClick={() =>
                                  handleRemoveAttributeHierarchy(index, index_h)
                                }
                              >
                                Remove hierarchy
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="row mt-3">
                        <div className="col d-flex">
                          <button
                            className="btn btn-outline-secondary btn-sm me-2"
                            type="button"
                            onClick={() => addAttribute(index)}
                          >
                            <i className="bi bi-plus"></i> Add attribute
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => removeAttribute(index)}
                          >
                            <i className="bi bi-file-minus"></i> Remove attribute
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                {flagobj &&
                  hobjects.map((object, index) => (
                    <div
                      key={index}
                      className="col-auto d-inline-block mt-2 border border-secondary rounded p-3"
                    >
                      <h5 className="text-center">Object name</h5>
                      <select
                        name="name"
                        className="form-select form-select-sm mb-3"
                        value={hobjects[index].name}
                        onChange={(e) => handleChangeObjectName(e, index)}
                      >
                        <option value="None">None</option>
                        {object_list.map((o) => (
                          <option key={o.name} value={o.name}>
                            {o.name}
                          </option>
                        ))}
                      </select>

                      {object.attributes.map((attribute, index_a) => (
                        <div
                          key={index_a}
                          className="mb-3 p-3 border border-secondary rounded"
                        >
                          <h6>Attribute hierarchies</h6>
                          <select
                            className="form-select form-select-sm mb-2"
                            value={hobjects[index].attributes[index_a].name}
                            onChange={(e) =>
                              handleChangeObjectAttributeName(e, index, index_a)
                            }
                          >
                            <option value="None">None</option>
                            {object_list
                              .find((el) => el.name === hobjects[index].name)
                              ?.attributes.map((a) => (
                                <option key={a.name} value={a.name}>
                                  {a.name}
                                </option>
                              ))}
                          </select>
                          <select
                            name="type"
                            className="form-select form-select-sm mb-2"
                            value={hobjects[index].attributes[index_a].type}
                            onChange={(e) =>
                              handleChangeObjectAttributeType(e, index, index_a)
                            }
                          >
                            <option value="None">None</option>
                            <option value="static">static</option>
                            <option value="regex">regex</option>
                            <option value="interval">interval</option>
                          </select>

                          {attribute.hierarchies.map((h, index_h) => (
                            <div key={index_h} className="mb-2">
                              <input
                                className="form-control form-control-sm mb-1"
                                type="text"
                                placeholder="values separated by commas"
                                required
                                value={
                                  hobjects[index].attributes[index_a].hierarchies[
                                  index_h
                                  ]
                                }
                                onChange={(e) =>
                                  handleChangeObjectAttributeHierarchy(
                                    e,
                                    index,
                                    index_a,
                                    index_h
                                  )
                                }
                              />
                              <div className="d-flex">
                                <button
                                  className="btn btn-primary btn-sm me-2"
                                  type="button"
                                  onClick={() =>
                                    handleAddObjectAttributeHierarchy(
                                      index,
                                      index_a,
                                      index_h
                                    )
                                  }
                                >
                                  Add level
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  type="button"
                                  onClick={() =>
                                    handleRemoveObjectAttributeHierarchy(
                                      index,
                                      index_a,
                                      index_h
                                    )
                                  }
                                >
                                  Remove level
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="d-flex">
                            <button
                              className="btn btn-outline-secondary btn-sm me-2"
                              type="button"
                              onClick={() => addObjectAttribute(index, index_a)}
                            >
                              <i className="bi bi-plus"></i> Add attribute
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              type="button"
                              onClick={() =>
                                removeObjectAttribute(index, index_a)
                              }
                            >
                              <i className="bi bi-file-minus"></i> Remove
                              attribute
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="d-flex justify-content-center">
                        <button
                          className="btn btn-primary btn-sm me-2"
                          type="button"
                          onClick={addObject}
                        >
                          Add object
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => removeObject(index)}
                        >
                          Remove object
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <div className="col-auto mt-4">
            <button type="submit" className="btn btn-primary btn-sm ms-1 mt-2 btn-privacy">
              Generate hierarchy policy
            </button>
          </div>
        </form>

      </div>

    </section>
  );

});
export default Hierarchy;
