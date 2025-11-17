/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
 *
 * See LICENSE file in the project root for details.
 */

import "./App.css";
import { Routes, Route } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Hierarchy from "./components/Hierarchy";
// import { useAuth } from 'oidc-react';
import JSONviewer from "./components/JSONviewer";
import PrivacyPolicy from "./components/PrivacyPolicy";
import SendEvent from "./components/SendEvent";

function App() {
  // const auth = useAuth()
  // //console.log("userData-" + auth.userData)
  // if(auth.userData){
  //   console.log(auth.userData.access_token);
  //   console.log("user profile", auth.userData.profile);
  // }

  //strings for printing
  //descomentarconst schemes = ["quasi", "suppression", "generalization", "l-div-distinct", "l-div-recursive", "t-clos-ordered", "t-clos-hierachical"]
  const schemes = ["quasi", "suppression", "generalization", "pgp"];
  //const att_schemes = ["quasi", "suppression", "generalization", "dp laplace", "dp laplace truncated", "dp gaussian", "dp gaussian analytics", "dp laplace bounded domain", " dp laplace bounded noise", "dp uniform"]
  const att_schemes = ["quasi", "suppression", "generalization", "pgp"];
  const dp_schemes = [
    "laplace",
    "laplace truncated",
    "gaussian",
    "gaussian analytics",
    "laplace bounded domain",
    "laplace bounded noise",
    "uniform",
  ];
  //data for state
  const [campo, setCampo] = useState("por defecto");
  const [fields, setFields] = useState([""]);
  const [organization, setOrganization] = useState("");
  const [version, setVersion] = useState("");
  const [creator, setCreator] = useState("");
  const [attribute_list, setAttribute_list] = useState([]);
  const [object_list, setObject_list] = useState([
    { name: "", attributes: [{}] },
  ]);
  const [flagatt, setFlagatt] = useState(false);
  const [flagobj, setFlagobj] = useState(false);
  const [attributes, setAttributes] = useState([
    {
      name: "",
      pets: [{ scheme: "", metadata: { l: 0, c: 0, k: 0, level: 0 } }],
      dp: false,
      dp_params: {
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      },
    },
  ]);
  const [templates, setTemplates] = useState([
    {
      name: "",
      dp: false,
      "k-anonymity": false,
      k: 0,
      "k-map": false,
      attributes: [
        {
          name: "",
          pets: [{ scheme: "", metadata: { l: 0, c: 0, level: 0 } }],
        },
      ],
      "dp-policy": {
        "attribute-names": [""],
        "apply-to-all": false,
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      },
    },
  ]);
  const [attagroupations, setAttagroupations] = useState([
    {
      "attribute-names": [""],
      scheme: "",
      metadata: {
        epsilon: 0,
        delta: 0,
        sensitivity: 0,
        lower: -999,
        upper: 999,
      },
    },
  ]);
  const [filename, setFilename] = useState("");

  const [objectpolicy, setObjectpolicy] = useState({
    organization: "",
    creator: "",
    version: "",
    templates: [{ attributes: [{}], name: "" }],
  });

  const [policyContent, setPolicyContent] = useState(null);

  const [eventFile_JS_Object, setEventFile_JS_Object] = useState(null);

  function borra_empty(templates) {
    return templates.map((template) => ({
      ...template,
      attributes: template.attributes.map((attribute) => ({
        ...attribute,
        pets: attribute.pets.map((pet) => ({
          ...pet,
          metadata: Object.fromEntries(
            Object.entries(pet.metadata).filter(([, value]) => value !== 0)
          ),
        })),
      })),
    }));
  }

  function remove_dpparams_if_dp_false(templates) {
    return templates.map((template) => {
      if (!template.dp) {
        const { "dp-policy": dpPolicy, ...rest } = template;
        return rest;
      }
      return template;
    });
  }

  function adjustSchemeInPets(templates) {
    return templates.map((template) => {
      const attributes = template.attributes.map((attribute) => {
        const pets = attribute.pets.map((pet) => {
          if (pet.scheme === "quasi") {
            return { ...pet, scheme: "quasi/k-anonymity" };
          }
          return pet;
        });
        return { ...attribute, pets };
      });
      return { ...template, attributes };
    });
  }

  function addTypeToAttributesInTemplates(templates) {
    return templates.map((template) => {
      const updatedAttributes = template.attributes.map((attribute) => ({
        ...attribute,
        type: "", // Añade el campo 'type' con un valor por defecto vacío
      }));
      return { ...template, attributes: updatedAttributes };
    });
  }

  function addKToQuasiAttributes(templates) {
    // Iteramos sobre cada template
    for (let template of templates) {
      if (template.k !== 0) {
        // Verificamos si k es distinto de 0
        for (let attribute of template.attributes) {
          // Iteramos sobre los atributos de la template
          // Verificamos si el scheme del atributo es 'quasi' o 'quasi/k-anonymity'
          if (
            attribute.pets.some(
              (pet) =>
                pet.scheme === "quasi" || pet.scheme === "quasi/k-anonymity"
            )
          ) {
            // Iteramos sobre cada pet del atributo para agregar k en el metadata
            for (let pet of attribute.pets) {
              if (
                pet.scheme === "quasi" ||
                pet.scheme === "quasi/k-anonymity"
              ) {
                pet.metadata.k = template.k; // Añadimos el valor de k al metadata
              }
            }
          }
        }
      }
    }
    return templates;
  }

  // Función para añadir 'type' a cada atributo
  function addTypeToAttributes(attributes) {
    return attributes.map((attribute) => {
      attribute.type = ""; // Añadir el atributo 'type' vacío
      return attribute;
    });
  }

  // Función para eliminar 'dp_params' de cada atributo
  function removeDpParamsFromAttributes(attributes) {
    return attributes.map((attribute) => {
      delete attribute.dp_params; // Eliminar el atributo 'dp_params'
      return attribute;
    });
  }

  // Función para eliminar atributos con valor 0 dentro de 'metadata'
  function removeZeroValuesFromMetadata(attributes) {
    return attributes.map((attribute) => {
      let pet = attribute.pets[0]; // Asumiendo que solo hay un pet
      for (let key in pet.metadata) {
        if (pet.metadata[key] === 0) {
          delete pet.metadata[key]; // Eliminar atributos con valor 0
        }
      }
      return attribute;
    });
  }

  const manejaSubmit = (e) => {
    return new Promise((resolve, reject) => {
      e?.preventDefault();
      if (filename === "") {
        alert("Couldnt generate policy over no event");
        reject("Couldnt generate policy over no event");
        return;
      }
      console.log(creator);
      console.log(attribute_list);
      console.log(object_list);
      if (flagobj) {
        let politica = { "Privacy-policy": {} };
        politica["Privacy-policy"].creator = creator;
        politica["Privacy-policy"].organization = organization;
        politica["Privacy-policy"].version = version;
        politica["Privacy-policy"].uuid = uuidv4();
        let formatedtemplates = [...templates];
        for (let template of formatedtemplates) {
          if (template.k > 0) template["k-anonymity"] = true;
          if (template.name === "") {
            alert("Object name cannot be None");
            reject("Object name cannot be None");
            return;
          }
          for (let attribute of template.attributes) {
            if (attribute.name === "") {
              alert("attribute name cannot be None");
              reject("attribute name cannot be None");
              return;
            }
            if (attribute.pets[0].scheme === "") {
              alert("attribute technique cannot be None");
              reject("attribute technique cannot be None");
              return;
            }
            attribute["type"] = "";
          }
          if (template.dp) {
            if (
              template["dp-policy"]["attribute-names"].length == 0 ||
              template["dp-policy"]["attribute-names"][0] == ""
            ) {
              alert("no attribute selected in dp policy");
            }
            if (template["dp-policy"].scheme == "") {
              alert("no mechanism selected for dp policy");
            }
          }
        }
        let formatedtemplates_sanitized = borra_empty(formatedtemplates);
        formatedtemplates_sanitized = remove_dpparams_if_dp_false(
          formatedtemplates_sanitized
        );
        formatedtemplates_sanitized = adjustSchemeInPets(
          formatedtemplates_sanitized
        );
        formatedtemplates_sanitized = addTypeToAttributesInTemplates(
          formatedtemplates_sanitized
        );
        formatedtemplates_sanitized = addKToQuasiAttributes(
          formatedtemplates_sanitized
        );
        politica["Privacy-policy"].templates = formatedtemplates_sanitized;
        politica["Privacy-policy"].attributes = [];
        console.log(politica);
        //setPolicyContent
        setPolicyContent(politica);
        //download file
        const url = window.URL.createObjectURL(
          new Blob([JSON.stringify(politica)])
        );
        const link = document.createElement("a");
        link.href = url;
        let nameoffile = filename;
        nameoffile = nameoffile.replace(".json", "");
        console.log("file name " + nameoffile);
        link.setAttribute("download", nameoffile + "-policy.json");
        document.body.appendChild(link);
        link.click();
        resolve(politica);
      } else {
        let politica = { "Privacy-policy": {} };
        politica["Privacy-policy"].creator = creator;
        politica["Privacy-policy"].organization = organization;
        politica["Privacy-policy"].version = version;
        politica["Privacy-policy"].uuid = uuidv4();
        politica["Privacy-policy"].templates = [];
        //descomentar let formatedattributes = [...attributes]
        let formatedattributes = JSON.parse(JSON.stringify(attributes));
        for (let attribute of formatedattributes) {
          if (attribute.name === "") {
            alert("attribute name cannot be None");
            reject("attribute name cannot be None");
            return;
          }
          if (attribute.dp == false && attribute.pets[0].scheme === "") {
            alert("attribute technique cannot be None");
            reject("attribute technique cannot be None");
            return;
          }
          if (attribute.dp == true && attribute.dp_params.scheme == "") {
            //MAYBE IT DOES NOT HAPPEN NEVER, REMOVE IF NEVER SHOWS
            alert("attribute dp technique cannot be None");
            reject("attribute dp technique cannot be None");
            return;
          }
          //parse values
          let pet = attribute.pets[0];
          for (let p in pet.metadata) {
            console.log("p" + p);
            pet.metadata[p] = parseInt(pet.metadata[p]);
            console.log("value " + pet["metadata"][p]);
            if (pet.metadata[p] == 0) delete pet.metadata[p];
          }

          if (attribute.dp) {
            attribute.pets = [];
          }
          if (!attribute.dp) {
            attribute.dp_params = {};
          }
        }
        let formatedattributes_sanitized =
          addTypeToAttributes(formatedattributes);
        formatedattributes_sanitized = removeDpParamsFromAttributes(
          formatedattributes_sanitized
        );
        formatedattributes_sanitized = removeZeroValuesFromMetadata(
          formatedattributes_sanitized
        );
        politica["Privacy-policy"].attributes = formatedattributes_sanitized;
        politica["Privacy-policy"].templates = [];
        console.log(politica);
        //set policyContent
        setPolicyContent(politica);
        //download file
        const url = window.URL.createObjectURL(
          new Blob([JSON.stringify(politica)])
        );
        const link = document.createElement("a");
        link.href = url;
        let nameoffile = filename;
        nameoffile = nameoffile.replace(".json", "");
        console.log("file name " + nameoffile);
        link.setAttribute("download", nameoffile + "-policy.json");
        document.body.appendChild(link);
        link.click();
        resolve(politica);
      }
    });
  };

  const checkIfK = (index) => {
    let tmplts = [...templates];
    let obj = tmplts[index];
    let hasquasi = false;
    for (let t of obj.attributes) {
      if (t.pets[0].scheme === "quasi") {
        hasquasi = true;
        break;
      }
    }
    return hasquasi;
  };

  const handleCampo = (event) => {
    setCampo(event.target.value);
  };

  const handleStaticFields = (event, i) => {
    let user_input = event.target.value;
    switch (i) {
      case 0:
        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor1
        setOrganization(user_input);
        break;
      case 1:
        //Declaraciones ejecutadas cuando el resultado de expresión coincide con el valor2
        setVersion(user_input);
        break;
      case 2:
        //Declaraciones ejecutadas cuando el resultado de expresión coincide con valorN
        setCreator(user_input);
        break;
      default:
        //Declaraciones ejecutadas cuando ninguno de los valores coincide con el valor de la expresión
        break;
    }
  };

  const changeFieldValues = (event, index) => {
    let f = [...fields];
    f[index] = event.target.value;
    setFields(f);
  };
  const addField = () => {
    let f = [...fields];
    f.push("");
    setFields(f);
  };

  let fileReader;
  const handleFileChosen = (file) => {
    console.log("Entra");
    if (file != null) {
      // console.log("not null")
      setEventFile_JS_Object(file);
      fileReader = new FileReader();
      fileReader.onloadend = function () {
        console.log("on loadend");
        const content = fileReader.result;
        try {
          //parsear evento
          let parseTojson = JSON.parse(content);
          console.log("content");
          console.log(content);
          let attributes = parseTojson.Event.Attribute;
          let objects = parseTojson.Event.Object;
          let flag_atts = attributes !== undefined;
          let flag_objects = objects !== undefined;
          if (flag_atts) {
            console.log("trace attributes");
            if (flagobj) {
              console.log("trace setting objects false");
              setFlagobj(false);
              setTemplates([
                {
                  name: "",
                  dp: false,
                  attributes: [
                    {
                      name: "",
                      pets: [
                        { scheme: "", metadata: { l: 0, c: 0, level: 0 } },
                      ],
                    },
                  ],
                  "dp-policy": {
                    "attribute-names": [""],
                    "apply-to-all": false,
                    scheme: "",
                    metadata: {
                      epsilon: 0,
                      delta: 0,
                      sensitivity: 0,
                      lower: -999,
                      upper: 999,
                    },
                  },
                },
              ]);
            }
            //event of attributes
            let att_list = [];
            attributes.forEach((attribute) => {
              if (!att_list.includes(attribute["object_relation"]))
                att_list.push(attribute["object_relation"]);
            });
            setAttribute_list(att_list);
            setFlagatt(true);
            setFilename(file.name);
          } else if (flag_objects) {
            console.log("trace objects");
            if (flagatt) {
              console.log("trace setting attributes false");
              setFlagatt(false);
              setAttributes([
                {
                  name: "",
                  pets: [
                    { scheme: "", metadata: { l: 0, c: 0, k: 0, level: 0 } },
                  ],
                },
              ]);
            }
            //event of objects
            let obj_list = [];
            objects.forEach((object) => {
              if (!obj_list.some((o) => o.name === object.name))
                obj_list.push({ name: object.name, attributes: [] });
              object.Attribute.forEach((attribute) => {
                let obj = obj_list.find((el) => {
                  return el.name === object.name;
                });
                if (!obj.attributes.includes(attribute["object_relation"])) {
                  obj.attributes.push(attribute["object_relation"]);
                }
              });
            });
            setObject_list(obj_list);
            setFlagobj(true);
            console.log("obj-list" + obj_list);
            setFilename(file.name);
          }
        } catch (error) {
          alert("event file not correct");
        }
      };
      fileReader.onerror = errorfile;
      fileReader.readAsText(file);
    }
  };

  //[{"att_names": [''], "scheme": '', "metadata": {"epsilon": 0, "delta": 0, "sensitivity": 0}}]
  const changedp = (event, index) => {
    let tmplts = [...templates];
    if (event.target.checked) {
      tmplts[index].dp = true;
      console.log("set a true");
      console.log(tmplts[index]["dp-policy"]);
    } else {
      console.log("set a false");
      tmplts[index].dp = false;
      tmplts[index]["dp-policy"] = {
        "attribute-names": [""],
        "apply-to-all": false,
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      };
    }
    setTemplates(tmplts);
  };

  const changekmap = (event, index) => {
    let tmplts = [...templates];
    if (event.target.checked) {
      tmplts[index]["k-map"] = true;
    } else {
      tmplts[index]["k-map"] = false;
    }
    setTemplates(tmplts);
  };

  const changeAttAgroupationScheme = (event, index) => {
    let tmplts = [...templates];
    let att_ag = tmplts[index]["dp-policy"];
    att_ag.scheme = event.target.value;
    setTemplates(tmplts);
  };

  const changeAttAgroupationMetadata = (event, index, parameter) => {
    let tmplts = [...templates];
    let metadata = tmplts[index]["dp-policy"].metadata;
    switch (parameter) {
      case "epsilon":
        metadata.epsilon = event.target.value;
        break;
      case "delta":
        metadata.delta = event.target.value;
        break;
      case "sensitivity":
        metadata.sensitivity = event.target.value;
        break;
    }
    setTemplates(tmplts);
  };

  const changeAttAgroupation = (event, index) => {
    let tmplts = [...templates];
    let att_agg = tmplts[index]["dp-policy"];
    let values = [];
    let options = event.target.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        values.push(options[i].value);
      }
    }
    console.log("lenght " + values.length + " " + values);
    let attributes_names = tmplts[index].attributes.map((a) => a.name);
    console.log(attributes_names);
    tmplts[index]["dp-policy"]["attribute-names"] = values;
    setTemplates(tmplts);
  };

  const addAttribute = () => {
    let atbts = [...attributes];
    atbts.push({
      name: "",
      pets: [{ scheme: "", metadata: { l: 0, c: 0, k: 0, level: 0 } }],
      dp: false,
      dp_params: {
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      },
    });
    setAttributes(atbts);
  };

  const removeAttribute = (index) => {
    let atbts = [...attributes];
    if (atbts.length > 1) {
      atbts.splice(index, 1);
      setAttributes(atbts);
    }
  };

  const handleChangeAttributeName = (event, index) => {
    let name = event.target.value;
    let atbts = [...attributes];
    let names = atbts.map((a) => a.name);
    let att = atbts[index];
    if (names.includes(name)) {
      alert("Only 1 policy per attribute");
    } else {
      att.name = name;
      att.pets = [{ scheme: "", metadata: { l: 0, c: 0, k: 0, level: 0 } }];
      setAttributes(atbts);
    }
  };

  const handleChangeAttributeScheme = (event, index) => {
    let scheme = event.target.value;
    let atbts = [...attributes];
    let att = atbts[index];
    if (scheme.includes("dp")) {
      //IMPORTANT**** HERE WHEN TECHNIQUE CHANGES TO SOME KIND OF DP, WE PUT THE DP NAME INTO PET SO IT SHOWS IN FRONTEND
      //REMOVE WHEN GENERATING POLICY FILE
      att.dp = true;
      att.pets[0] = {
        scheme: scheme,
        metadata: { l: 0, c: 0, k: 0, level: 0 },
      };
      att.dp_params.scheme = scheme;
      setAttributes(atbts);
    } else {
      att.dp = false;
      att.dp_params = {
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      };
      let pet = att.pets[0];
      pet.scheme = scheme;
      pet.metadata = { l: 0, c: 0, k: 0, level: 0 };
      setAttributes(atbts);
    }
  };

  const handleChangeDpAttribute = (event, index, parameter) => {
    let parametervalue = event.target.value;
    let atbs = [...attributes];
    let att = atbs[index];
    switch (parameter) {
      case "epsilon":
        att.dp_params.metadata.epsilon = parametervalue;
        break;
      case "delta":
        att.dp_params.metadata.delta = parametervalue;
        break;
      case "sensitivity":
        att.dp_params.metadata.sensitivity = parametervalue;
        break;
    }
    setAttributes(atbs);
  };

  const handleChangeAttributeParameter = (event, index, parameter) => {
    let parametervalue = event.target.value;
    let atbts = [...attributes];
    let att = atbts[index];
    let metadata = att.pets[0].metadata;
    switch (parameter) {
      case "k":
        if (isNaN(parametervalue)) {
          alert("k must be an int");
          console.log("is a delete tecla");
        } else {
          console.log("Toma valor");
          console.log(typeof parametervalue);
          console.log("parameter value " + parametervalue);
          metadata.k = parametervalue;
        }
        break;
      case "l":
        if (isNaN(parametervalue)) {
          alert("l must be an int");
        } else {
          metadata.l = parametervalue;
        }
        break;
      case "c":
        if (isNaN(parametervalue)) {
          alert("c must be an int");
        } else {
          metadata.c = parametervalue;
        }
        break;
      case "t":
        //check conversion to double
        if (isNaN(parametervalue)) {
          alert("t must be an double");
        } else {
          metadata.k = parametervalue;
        }
        break;
      case "level":
        if (isNaN(parametervalue)) {
          alert("level must be an int");
        } else {
          metadata.level = parametervalue;
        }
        break;
    }
    setAttributes(atbts);
  };

  const addObject = () => {
    let tmplts = [...templates];
    tmplts.push({
      name: "",
      dp: false,
      attributes: [
        {
          name: "",
          pets: [{ scheme: "", metadata: { l: 0, c: 0, level: 0 } }],
        },
      ],
      "dp-policy": {
        "attribute-names": [""],
        "apply-to-all": false,
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      },
    });
    setTemplates(tmplts);
  };

  const removeObject = (index) => {
    let tmplts = [...templates];
    if (tmplts.length > 1) {
      tmplts.splice(index, 1);
      setTemplates(tmplts);
    }
  };

  const addObjectAttribute = (index) => {
    let tmplts = [...templates];
    let object = tmplts[index];
    object.attributes.push({
      name: "",
      pets: [{ scheme: "", metadata: { l: 0, c: 0, level: 0 } }],
    });
    setTemplates(tmplts);
  };

  const removeObjectAttribute = (i_o, i_a) => {
    let tmplts = [...templates];
    let object = tmplts[i_o];
    if (object.attributes.length > 1) {
      object.attributes.splice(i_a, 1);
      setTemplates(tmplts);
    }
  };

  const handleChangeNameObject = (event, index) => {
    let name = event.target.value;
    let tmplts = [...templates];
    console.log("att_agroupations 1 " + tmplts[index]["dp-policy"]);
    let objnames = tmplts.map((t) => t.name);
    if (objnames.includes(name)) {
      alert("Only 1 policy per object");
    } else {
      let template = tmplts[index];
      template.name = name;
      template.attributes = [
        {
          name: "",
          pets: [{ scheme: "", metadata: { l: 0, c: 0, level: 0 } }],
        },
      ];
      template["dp-policy"] = {
        "attribute-names": [""],
        "apply-to-all": false,
        scheme: "",
        metadata: {
          epsilon: 0,
          delta: 0,
          sensitivity: 0,
          lower: -999,
          upper: 999,
        },
      };
      setTemplates(tmplts);
    }
    console.log("att_agroupations " + tmplts[index]["dp-policy"]);
  };

  const handleChangeNameObjectAttribute = (event, i_o, i_a) => {
    let name = event.target.value;
    let tmplts = [...templates];
    let object = tmplts[i_o];
    let attnames = object.attributes.map((a) => a.name);
    if (attnames.includes(name)) {
      alert("Only 1 policy per attribute");
    } else if (tmplts[i_o]["dp-policy"]["attribute-names"].includes(name)) {
      alert("Already selected in dp policies");
    } else {
      let attribute = object.attributes[i_a];
      attribute.name = name;
      attribute.pets = [{ scheme: "", metadata: { l: 0, c: 0, level: 0 } }];
      setTemplates(tmplts);
    }
  };

  const handleChangeObjectAttributeScheme = (event, i_o, i_a) => {
    let scheme = event.target.value;
    let tmplts = [...templates];
    let object = tmplts[i_o];
    let attribute = object.attributes[i_a];
    let pet = attribute.pets[0];
    let oldscheme = pet.scheme;
    pet.scheme = scheme;
    let flag_quasi = false;
    if (oldscheme === "quasi") {
      for (let att of object.attributes) {
        if (att.scheme === "quasi") flag_quasi = true;
      }
      if (flag_quasi == true) object.k = 0;
    }
    pet.metadata = { l: 0, c: 0, level: 0 };
    setTemplates(tmplts);
  };

  const handleChangeObjectAttributeMetadata = (event, parameter, i_o, i_a) => {
    let parametervalue = event.target.value;
    let tmplts = [...templates];
    let object = tmplts[i_o];
    let attribute = object.attributes[i_a];
    let pet = attribute.pets[0];
    let metadata = pet.metadata;
    switch (parameter) {
      case "l":
        if (isNaN(parametervalue)) {
          alert("l must be an int");
        } else {
          metadata.l = parametervalue;
        }
        break;
      case "c":
        if (isNaN(parametervalue)) {
          alert("c must be an int");
        } else {
          metadata.c = parametervalue;
        }
        break;
      case "level":
        if (isNaN(parametervalue)) {
          alert("level must be an int");
        } else {
          metadata.level = parametervalue;
        }
        break;
      case "t":
        if (isNaN(parametervalue)) {
          alert("t must be a double");
        } else {
          //convert to double
          metadata.t = parametervalue;
        }
        break;
    }
    setTemplates(tmplts);
  };

  const handleChangeObjectK = (event, index) => {
    let k = event.target.value;
    let tmplts = [...templates];
    let object = tmplts[index];
    if (isNaN(k)) {
      alert("K must be integer");
    } else {
      object.k = parseInt(k);
      console.log("set k " + k + object.k);
      setTemplates(tmplts);
    }
  };

  const errorfile = () => {
    console.log("error en lectura");
  };

  //pretty print
  const [jsonContent, setJsonContent] = useState(null);

  // Función para manejar la carga de archivos
  const handleFileChangePretty = (event) => {
    const file = event.target.files[0];

    if (file && file.type === "application/json") {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Parsear y formatear el JSON
          const json = JSON.parse(e.target.result);
          setJsonContent(json);
        } catch (error) {
          alert("Error al leer el archivo JSON: " + error.message);
        }
      };

      reader.readAsText(file);
    } else {
      alert("Please select a valid JSON file");
    }
  };

  //nueva seccion de envio
  // Nuevos estados para la sección de checkboxes y selectores
  const [generatePolicy, setGeneratePolicy] = useState(false);
  const [generateHierarchy, setGenerateHierarchy] = useState(false);
  const [useEventInput, setUseEventInput] = useState(false);
  const [selectedPolicyFile, setSelectedPolicyFile] = useState(null);
  const [selectedHierarchyFile, setSelectedHierarchyFile] = useState(null);
  const [selectedEventFile, setSelectedEventFile] = useState(null);
  const [hierarchyFileContent, setHierarchyFileContent] = useState(null);

  const hierarchyRef = useRef(); //Referencia al componente Hierarchy
  const handleCheckboxChange = (setter) => (event) => {
    setter(event.target.checked);
  };

  const handleFileChange = (setter) => (event) => {
    setter(event.target.files[0]);
  };

  async function getContentOrFile(input) {
    if (input instanceof File) {
      return await readFile(input);
    } else {
      return input;
    }
  }

  function isFileName(inputString) {
    const fileExtensionPattern = /\.[0-9a-z]+$/i;
    return fileExtensionPattern.test(inputString);
  }

  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function formatContent(content, expectedKey) {
    // Si el contenido es una cadena, intente analizarlo como JSON
    if (typeof content === "string") {
      content = JSON.parse(content);
    }

    // Si el contenido es un objeto que ya tiene la clave esperada, extraer el valor
    if (content && content.hasOwnProperty(expectedKey)) {
      return content[expectedKey];
    }

    // De lo contrario, devolver el contenido tal cual
    return false;
  }

  async function sendToAnonymizer(privacypolicy, hierarchypolicy, eventFile) {
    try {
      let policyContent = await getContentOrFile(privacypolicy);
      let hierarchyContent = await getContentOrFile(hierarchypolicy);
      let eventContent = await readFile(eventFile);

      const formattedPolicyContent = formatContent(
        policyContent,
        "Privacy-policy"
      );
      const formattedHierarchyContent = formatContent(
        hierarchyContent,
        "Hierarchy-policy"
      );
      const formattedEventContent = formatContent(eventContent, "Event");
      console.log(formattedPolicyContent);
      console.log(formattedHierarchyContent);
      console.log(formattedEventContent);

      if (
        [
          formattedPolicyContent,
          formattedHierarchyContent,
          formattedEventContent,
        ].some((b) => !b)
      ) {
        if (!formattedPolicyContent) {
          alert(
            "Invalid privacy policy file contents.  Ensure that the file is valid"
          );
        } else if (!formattedHierarchyContent) {
          alert(
            "Invalid hierarchy policy file contents.  Ensure that the file is valid"
          );
        } else if (!formattedEventContent) {
          alert(
            "Invalid event file contents.  Ensure that the file is valid"
          );
        }
        return -1;
      }
      //crear el body de la solicitud
      let body = JSON.stringify({
        Event: formattedEventContent,
        "Privacy-policy": formattedPolicyContent,
        "Hierarchy-policy": formattedHierarchyContent,
      });
      const headers = {
        "Transformer-Type": "misp.MispTransformer",
        "Content-Type": "application/json",
        Authorization: auth.userData.access_token,
      };

      //enviar la solicitud usnado fetch
      let URL = process.env.REACT_APP_PRIVSERV_URL;
      const response = await fetch(URL, {
        method: "POST",
        headers: headers,
        body: body,
      });

      // Manejar la respuesta
      const responseData = await response.json();
      console.log("Response Status:", response.status);
      if (response.status == 200) {
        alert("Event sent and published in MISP instance");
        console.log("Event sent and published in MISP instance");
        console.log("Response Data:", responseData);
        return 200;
      } else {
        console.error("Not allowed");
        return -1;
      }
    } catch (error) {
      console.error("Error sending request: ", error);
      return -1;
    }
  }

  const handleSendRequest = async () => {
    let payload = {};
    console.log("Prinea?");
    // Cambia 'const' a 'let' para permitir la reasignación
    let hierarchyFileContent = null;
    let policyFileContent = policyContent;

    let inputs = {};
    if (generatePolicy) {
      console.log("Casuistica 1");
      if (!policyContent) {
        // Verifica si ya se ha generado el archivo; si no, llama a la función existente de generación
        console.log("Casuistica 2");
        await manejaSubmit();

        policyFileContent = await new Promise((resolve) => {
          setPolicyContent((prev) => {
            console.log("pfc dentro del promise: ", prev);
            resolve(prev);
            return prev;
          });
        });
      }
      console.log("Casuistica 3");
      console.log("policy content" + policyFileContent);
      //deberia ser el mismo que policyFileContent
      payload["policyFile"] = policyFileContent; // se asigna el contenido de la politica generada
    } else if (selectedPolicyFile) {
      payload["policyFile"] = selectedPolicyFile; // Usa el archivo seleccionado
    }

    console.log("Previo a hierarchy");
    if (generateHierarchy) {
      console.log("Posterior a hierarchy");
      if (!hierarchyFileContent) {
        console.log("Buena casuistica");
        await hierarchyRef.current.triggerHierarchyGeneration();

        // Espera a que `handleGenerateHierarchy` se complete
        hierarchyFileContent = await new Promise((resolve) => {
          setHierarchyFileContent((prev) => {
            console.log("hfc dentro del promise: ", prev);
            resolve(prev); // Resuelve con el estado actualizado
            return prev; // Devuelve el mismo valor (solo para actualizar el estado sin cambios)
          });
        });
      }
      console.log("hfc" + hierarchyFileContent);
      payload["hierarchyFile"] = hierarchyFileContent;
    } else if (selectedHierarchyFile) {
      payload["hierarchyFile"] = selectedHierarchyFile;
    }

    if (useEventInput) {
      if (!filename != "") {
        alert("No event introduced");
        return;
      }
      //filename contiene ya el nombre del fichero
      if (eventFile_JS_Object == null) {
        alert("The Event file is not loaded. Add it to the Event Selector");
      }
      payload["eventFile"] = eventFile_JS_Object;
    } else if (selectedEventFile) {
      payload["eventFile"] = selectedEventFile;
    }

    console.log("Payload a enviar:", payload);
    let code = await sendToAnonymizer(
      payload["policyFile"],
      payload["hierarchyFile"],
      payload["eventFile"]
    );
    if (code != 200) {
      alert("Error while publishing event");
    }
    // Aquí puedes realizar la petición al componente que desees con el payload
  };

  const handleGenerateHierarchy = (content) => {
    return new Promise((resolve) => {
      setHierarchyFileContent(content);
      console.log("Fichero de jerarquía generado:", content);
      resolve(content);
    });
  };

  //fin de nueva seccion de envio

  const [activeSection, setActiveSection] = useState("selectEvent"); // por defecto «Select Event»

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="App d-flex" style={{ minHeight: "100vh" }}>
              {/* Sidebar */}
              <aside
                className="sidenav bg-light border-end flex-shrink-0 position-sticky"
                style={{
                  top: "0",
                  width: "auto",
                  height: "100vh",
                  overflowY: "auto",
                }}
              >
                {/* Logo */}
                <div className="d-flex justify-content-center p-2">
                  <img
                    src="/images/logo.png"
                    alt="Logo"
                  />
                </div>
                {/* Botón 1. Generar Política */}
                <button
                  className={`btn w-100 mb-2 d-flex align-items-center ${activeSection === "selectEvent"
                    ? "btn-primary"
                    : "btn-outline-primary"
                    }`}
                  onClick={() => setActiveSection("selectEvent")}
                >
                  <img
                    src="/icons/lock.svg"
                    alt="Privacy policy icon"
                    className="me-2"
                    style={{ width: '16px', height: '16px' }}
                  />
                  Privacy policy
                </button>
                {/* Botón 2. Generar Jerarquía */}
                <button
                  className={`btn w-100 mb-2 ${activeSection === "hierarchy"
                    ? "btn-primary"
                    : "btn-outline-primary"
                    }`}
                  onClick={() => setActiveSection("hierarchy")}

                >
                  <img
                    src="/icons/align-center.svg"
                    alt="Hierarcy policy icon"
                    className="me-2"
                    style={{ width: '16px', height: '16px' }}
                  />
                  Hierarchy policy
                </button>
                {/* Botón 3. Mostrar JSON */}
                <button
                  className={`btn w-100 mb-2 ${activeSection === "showJson"
                    ? "btn-primary"
                    : "btn-outline-primary"
                    }`}
                  onClick={() => setActiveSection("showJson")}
                >
                  <img
                    src="/icons/file-text.svg"
                    alt="'Show JSON' icon"
                    className="me-2"
                    style={{ width: '16px', height: '16px' }}
                  />
                  JSON viewer
                </button>
                {/* Botón 4. Enviar Evento. TODO: Mover la funcionalidad a la barra lateral */}
                <button
                  className={`btn w-100 ${activeSection === "sendEvent"
                    ? "btn-primary"
                    : "btn-outline-primary"
                    }`}
                  onClick={() => setActiveSection("sendEvent")}
                >
                  <img
                    src="/icons/tool.svg"
                    alt="Manual anonymization icon"
                    className="me-2"
                    style={{ width: '16px', height: '16px' }}
                  />
                  Anonymization
                </button>
              </aside>

              {/* Contenido principal */}
              <main className="flex-grow-1 p-4">

                {/* Sección 1: Select Event + Privacy Policy Form */}
                {activeSection === "selectEvent" && (
                  <PrivacyPolicy
                    onFileChosen={handleFileChosen}
                    organization={organization}
                    creator={creator}
                    version={version}
                    handleStaticFields={handleStaticFields}
                    onSubmit={manejaSubmit}

                    flagatt={flagatt}
                    attributes={attributes}
                    attribute_list={attribute_list}
                    att_schemes={att_schemes}
                    handleChangeAttributeName={handleChangeAttributeName}
                    handleChangeAttributeScheme={handleChangeAttributeScheme}
                    handleChangeAttributeParameter={handleChangeAttributeParameter}
                    handleChangeDpAttribute={handleChangeDpAttribute}
                    removeAttribute={removeAttribute}
                    addAttribute={addAttribute}

                    flagobj={flagobj}
                    templates={templates}
                    object_list={object_list}
                    dp_schemes={dp_schemes}
                    schemes={schemes}
                    handleChangeNameObject={handleChangeNameObject}
                    changedp={changedp}
                    changeAttAgroupation={changeAttAgroupation}
                    changeAttAgroupationScheme={changeAttAgroupationScheme}
                    changeAttAgroupationMetadata={changeAttAgroupationMetadata}
                    checkIfK={checkIfK}
                    handleChangeObjectK={handleChangeObjectK}
                    changekmap={changekmap}
                    handleChangeNameObjectAttribute={handleChangeNameObjectAttribute}
                    handleChangeObjectAttributeScheme={handleChangeObjectAttributeScheme}
                    handleChangeObjectAttributeMetadata={handleChangeObjectAttributeMetadata}
                    removeObjectAttribute={removeObjectAttribute}
                    addObjectAttribute={addObjectAttribute}
                    addObject={addObject}
                    removeObject={removeObject}
                  />
                )}

                {/* Sección 2: Hierarchy Creator */}
                {activeSection === "hierarchy" && (
                  <Hierarchy
                    ref={hierarchyRef}
                    onGenerateHierarchy={handleGenerateHierarchy}
                  />
                )}

                {/* Sección 3: JSON Viewer */}
                {
                  activeSection === "showJson" && (
                    <JSONviewer
                      jsonContent={jsonContent}
                      handleFileChangePretty={handleFileChangePretty}
                    />
                  )
                }

                {/* Sección 4: Send Event Controls */}
                {activeSection === "sendEvent" && (
                  <SendEvent
                    useEventInput={useEventInput}
                    setUseEventInput={setUseEventInput}
                    selectedEventFile={selectedEventFile}
                    setSelectedEventFile={setSelectedEventFile}
                    generatePolicy={generatePolicy}
                    setGeneratePolicy={setGeneratePolicy}
                    selectedPolicyFile={selectedPolicyFile}
                    setSelectedPolicyFile={setSelectedPolicyFile}
                    generateHierarchy={generateHierarchy}
                    setGenerateHierarchy={setGenerateHierarchy}
                    selectedHierarchyFile={selectedHierarchyFile}
                    setSelectedHierarchyFile={setSelectedHierarchyFile}
                    handleCheckboxChange={handleCheckboxChange}
                    handleFileChange={handleFileChange}
                    handleSendRequest={handleSendRequest}
                  />
                )}
              </main>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
