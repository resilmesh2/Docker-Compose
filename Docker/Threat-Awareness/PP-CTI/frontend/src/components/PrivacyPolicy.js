/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
 *
 * See LICENSE file in the project root for details.
 */

import React from "react";

function PrivacyPolicy({
    onFileChosen,

    organization,
    creator,
    version,
    handleStaticFields,
    onSubmit,

    flagatt,
    attributes,
    attribute_list,
    att_schemes,
    handleChangeAttributeName,
    handleChangeAttributeScheme,
    handleChangeAttributeParameter,
    handleChangeDpAttribute,
    removeAttribute,
    addAttribute,

    flagobj,
    templates,
    object_list,
    dp_schemes,
    schemes,
    handleChangeNameObject,
    changedp,
    changeAttAgroupation,
    changeAttAgroupationScheme,
    changeAttAgroupationMetadata,
    checkIfK,
    handleChangeObjectK,
    changekmap,
    handleChangeNameObjectAttribute,
    handleChangeObjectAttributeScheme,
    handleChangeObjectAttributeMetadata,
    removeObjectAttribute,
    addObjectAttribute,
    addObject,
    removeObject }) {

    return (
        <section
            tabIndex={0}
            className="section d-flex flex-column p-3"
            style={{ gap: "3rem" }}
        >

            {/* Contenedor centrado con el label y el input*/}
            <div className="d-flex justify-content-center">
                <div className="d-flex flex-column align-items-center">
                    <label
                        htmlFor="event-file-input"
                        className="form-label h5 mb-2 text-center"
                    >
                        Select event to process:
                    </label>
                    <input
                        id="event-file-input"
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) onFileChosen(file);
                        }}
                        className="form-control form-control-sm"
                        style={{ maxWidth: "250px" }}
                    />
                </div>
            </div>
            {/* Container para  formulario politica privacidad */}
            <div>
                <h5 className="ms-2 mt-3">
                    Privacy policy form
                </h5>
                <form
                    className="ms-2 mt-4"
                    onSubmit={onSubmit}
                >
                    <div className="d-inline-block">
                        <h5 className="ms-2 mt-1 d-block">Organization</h5>
                        <input
                            className="ms-2 mb-1"
                            size="12"
                            name="organization"
                            placeholder="organization"
                            required
                            value={organization}
                            onChange={(event) => handleStaticFields(event, 0)}
                        />
                    </div>

                    <div className="d-inline-block">
                        <h5 className="ms-2 mt-1 d-block">Creator</h5>
                        <input
                            className="ms-2 mb-1"
                            size="12"
                            name="creator"
                            placeholder="creator"
                            required
                            value={creator}
                            onChange={(event) => handleStaticFields(event, 2)}
                        />
                    </div>

                    <div className="d-inline-block">
                        <h5 className="ms-2 mt-1 d-block">Version</h5>
                        <input
                            className="ms-2 mb-1"
                            size="12"
                            name="version"
                            placeholder="version"
                            required
                            value={version}
                            onChange={(event) => handleStaticFields(event, 1)}
                        />
                    </div>

                    {/* Formulario expandido una vez se carga el evento */}
                    {flagatt && attributes.map((attribute, index) => (
                        <div key={index}>
                            <div className="mt-4 d-inline-block">
                                {/* Select de nombre */}
                                <select
                                    className="ms-2"
                                    name="attname"
                                    value={attributes[index].name}
                                    onChange={(event) => handleChangeAttributeName(event, index)}
                                >
                                    <option hidden value="None">
                                        Attribute name
                                    </option>
                                    {attribute_list.map((a, i) => (
                                        <option key={i} value={a}>
                                            {a}
                                        </option>
                                    ))}
                                </select>

                                {/* Select de técnica */}
                                <select
                                    className="ms-2"
                                    name="scheme"
                                    value={attributes[index].pets[0].scheme}
                                    onChange={(event) => handleChangeAttributeScheme(event, index)}
                                >
                                    <option hidden value="None">
                                        Technique
                                    </option>
                                    {att_schemes.map((s, i) => (
                                        <option key={i} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>

                                {/* Inputs condicionales */}
                                {["generalization", "suppression"].includes(
                                    attributes[index].pets[0].scheme
                                ) && (
                                        <label className="ms-2">
                                            level:
                                            <input
                                                className="ms-2"
                                                placeholder="level"
                                                size="5"
                                                name="level-att"
                                                type="number"
                                                min="1"
                                                step="1"
                                                required
                                                value={attributes[index].pets[0].metadata.level}
                                                onChange={(event) =>
                                                    handleChangeAttributeParameter(event, index, "level")
                                                }
                                            />
                                        </label>
                                    )}

                                {attributes[index].pets[0].scheme.includes("l-div") && (
                                    <label className="ms-2">
                                        l:
                                        <input
                                            className="ms-2"
                                            placeholder="l"
                                            size="5"
                                            name="l-att"
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            value={attributes[index].pets[0].metadata.l}
                                            onChange={(event) =>
                                                handleChangeAttributeParameter(event, index, "l")
                                            }
                                        />
                                    </label>
                                )}

                                {attributes[index].pets[0].scheme === "l-div-recursive" && (
                                    <label className="ms-2">
                                        c:
                                        <input
                                            className="ms-2"
                                            size="5"
                                            name="c-att"
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            value={attributes[index].pets[0].metadata.c}
                                            onChange={(event) =>
                                                handleChangeAttributeParameter(event, index, "c")
                                            }
                                        />
                                    </label>
                                )}

                                {attributes[index].pets[0].scheme.includes("t-clos") && (
                                    <label className="ms-2">
                                        t:
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="ms-2"
                                            size="5"
                                            name="t-att"
                                            required
                                            value={attributes[index].pets[0].metadata.t}
                                            onChange={(event) =>
                                                handleChangeAttributeParameter(event, index, "t")
                                            }
                                        />
                                    </label>
                                )}

                                {attributes[index].pets[0].scheme.includes("quasi") && (
                                    <label className="ms-2">
                                        k:
                                        <input
                                            className="ms-2"
                                            size="5"
                                            name="k-att"
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            value={attributes[index].pets[0].metadata.k}
                                            onChange={(event) =>
                                                handleChangeAttributeParameter(event, index, "k")
                                            }
                                        />
                                    </label>
                                )}

                                {/* DP params si aplica */}
                                {attributes[index].dp === true &&
                                    !attributes[index].pets[0].scheme.includes("uniform") && (
                                        <div className="mt-2 ms-2 mb-2 pb-2 row border border-secondary rounded">
                                            <label className="ms-2 col-3">
                                                Epsilon:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="epsilon"
                                                    required
                                                    value={attributes[index].dp_params.metadata.epsilon}
                                                    onChange={(e) =>
                                                        handleChangeDpAttribute(e, index, "epsilon")
                                                    }
                                                />
                                            </label>
                                            <label className="ms-2 col-3">
                                                Delta:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="delta"
                                                    required
                                                    value={attributes[index].dp_params.metadata.delta}
                                                    onChange={(e) =>
                                                        handleChangeDpAttribute(e, index, "delta")
                                                    }
                                                />
                                            </label>
                                            <label className="ms-2 col-3">
                                                Sensitivity:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="sensitivity"
                                                    required
                                                    value={attributes[index].dp_params.metadata.sensitivity}
                                                    onChange={(e) =>
                                                        handleChangeDpAttribute(e, index, "sensitivity")
                                                    }
                                                />
                                            </label>
                                        </div>
                                    )}

                                {attributes[index].pets[0].scheme.includes("uniform") && (
                                    <div className="mt-2 ms-2 mb-2 pb-2 row border border-secondary rounded">
                                        <label className="ms-2 col-5">
                                            Delta:
                                            <input
                                                type="number"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                className="ms-2"
                                                size="5"
                                                name="delta"
                                                required
                                                value={attributes[index].dp_params.metadata.delta}
                                                onChange={(e) => handleChangeDpAttribute(e, index, "delta")}
                                            />
                                        </label>
                                        <label className="ms-2 col-5">
                                            Sensitivity:
                                            <input
                                                type="number"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                className="ms-2"
                                                size="5"
                                                name="sensitivity"
                                                required
                                                value={attributes[index].dp_params.metadata.sensitivity}
                                                onChange={(e) =>
                                                    handleChangeDpAttribute(e, index, "sensitivity")
                                                }
                                            />
                                        </label>
                                    </div>
                                )}

                                {/* Botones */}
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm ms-2"
                                    onClick={() => removeAttribute(index)}
                                >
                                    Delete attribute
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm ms-2"
                                    onClick={() => addAttribute()}
                                >
                                    Add attribute
                                </button>
                            </div>
                        </div>
                    ))}
                    {flagobj && templates.map((template, index) => (
                        <div className="mb-3" key={index}>
                            {/* Selector de objeto */}
                            <div className="mt-4 d-inline-block">
                                <h5 className="d-block">Nombre del objeto</h5>
                                <select
                                    className="ms-2"
                                    name="name"
                                    value={templates[index].name}
                                    onChange={(event) => handleChangeNameObject(event, index)}
                                >
                                    <option hidden value="None">
                                        Object type
                                    </option>
                                    {object_list.map((o_n, i) => (
                                        <option key={i} value={o_n.name}>
                                            {o_n.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Checkbox para aplicar DP */}
                                <label className="ms-2">
                                    Apply differential privacy:{" "}
                                    <input
                                        type="checkbox"
                                        className="ms-2"
                                        checked={templates[index].dp}
                                        onChange={(e) => changedp(e, index)}
                                    />
                                </label>
                            </div>

                            {/* Configuración DP si está activado */}
                            {templates[index].dp && (
                                <div className="mt-2 ms-2 me-2 mb-2">
                                    {/* Selección de atributos */}
                                    <div className="d-flex justify-content-center">
                                        <select
                                            className="form-select form-select-sm"
                                            style={{ width: "250px" }}
                                            name="attributes"
                                            value={templates[index]["dp-policy"]["attribute-names"]}
                                            onChange={(e) => changeAttAgroupation(e, index)}
                                            multiple
                                        >
                                            {object_list
                                                .find((el) => el.name === templates[index].name)
                                                ?.attributes.map((a, i) => (
                                                    <option key={i} value={a}>
                                                        {a}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Mecanismo de DP */}
                                    <label className="mt-2">
                                        Differential privacy mechanism:{" "}
                                        <select
                                            className="ms-2"
                                            name="schemedp"
                                            value={templates[index]["dp-policy"].scheme}
                                            onChange={(event) => changeAttAgroupationScheme(event, index)}
                                        >
                                            <option hidden value="None">
                                                mecanismo
                                            </option>
                                            {dp_schemes.map((s, i) => (
                                                <option key={i} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    {/* Inputs para metadata DP */}
                                    {templates[index]["dp-policy"].scheme !== "uniform" && (
                                        <div className="ms-2 mt-2 mb-2">
                                            <label className="ms-2">
                                                Epsilon:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="epsilon"
                                                    required
                                                    value={templates[index]["dp-policy"].metadata.epsilon}
                                                    onChange={(e) =>
                                                        changeAttAgroupationMetadata(e, index, "epsilon")
                                                    }
                                                />
                                            </label>

                                            <label className="ms-2">
                                                Delta:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="delta"
                                                    required
                                                    value={templates[index]["dp-policy"].metadata.delta}
                                                    onChange={(e) =>
                                                        changeAttAgroupationMetadata(e, index, "delta")
                                                    }
                                                />
                                            </label>

                                            <label className="ms-2">
                                                Sensitivity:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="sensitivity"
                                                    required
                                                    value={templates[index]["dp-policy"].metadata.sensitivity}
                                                    onChange={(e) =>
                                                        changeAttAgroupationMetadata(e, index, "sensitivity")
                                                    }
                                                />
                                            </label>
                                        </div>
                                    )}

                                    {templates[index]["dp-policy"].scheme === "uniform" && (
                                        <div className="ms-2 mt-2 mb-2">
                                            <label className="ms-2">
                                                Delta:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="delta"
                                                    required
                                                    value={templates[index]["dp-policy"].metadata.delta}
                                                    onChange={(e) =>
                                                        changeAttAgroupationMetadata(e, index, "delta")
                                                    }
                                                />
                                            </label>

                                            <label className="ms-2">
                                                Sensitivity:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="sensitivity"
                                                    required
                                                    value={templates[index]["dp-policy"].metadata.sensitivity}
                                                    onChange={(e) =>
                                                        changeAttAgroupationMetadata(e, index, "sensitivity")
                                                    }
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Parámetro K */}
                            {checkIfK(index) && (
                                <div className="mt-2">
                                    <label className="ms-2 mt-2">
                                        k:{" "}
                                        <input
                                            className="ms-2 mt-1"
                                            size="5"
                                            type="number"
                                            min="1"
                                            step="1"
                                            required
                                            onChange={(event) => handleChangeObjectK(event, index)}
                                        />
                                    </label>
                                    <label className="ms-2">
                                        Apply k-map:{" "}
                                        <input
                                            type="checkbox"
                                            className="ms-2"
                                            checked={templates[index].k_map}
                                            onChange={(e) => changekmap(e, index)}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Atributos dinámicos */}
                            {template.attributes.map((attribute, i_a) => (
                                <div className="mt-3" key={i_a}>
                                    <select
                                        className="ms-2"
                                        name="nameselector"
                                        value={templates[index].attributes[i_a].name}
                                        onChange={(event) =>
                                            handleChangeNameObjectAttribute(event, index, i_a)
                                        }
                                    >
                                        <option hidden value="None">
                                            Attribute name
                                        </option>
                                        {object_list.find((el) => el.name === templates[index].name)
                                            ?.attributes.map((a, i) => (
                                                <option key={i} value={a}>
                                                    {a}
                                                </option>
                                            ))}
                                    </select>

                                    <select
                                        className="ms-2"
                                        name="scheme"
                                        value={templates[index].attributes[i_a].pets[0].scheme}
                                        onChange={(event) =>
                                            handleChangeObjectAttributeScheme(event, index, i_a)
                                        }
                                    >
                                        <option hidden value="None">
                                            Technique
                                        </option>
                                        {schemes.map((scheme, i) => (
                                            <option key={i} value={scheme}>
                                                {scheme}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Campos condicionales según esquema */}
                                    {templates[index].attributes[i_a].pets[0].scheme.includes(
                                        "l-div"
                                    ) && (
                                            <label className="ms-2">
                                                l:
                                                <input
                                                    className="ms-2"
                                                    size="5"
                                                    name="l"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    required
                                                    value={templates[index].attributes[i_a].pets[0].metadata.l}
                                                    onChange={(e) =>
                                                        handleChangeObjectAttributeMetadata(e, "l", index, i_a)
                                                    }
                                                />
                                            </label>
                                        )}

                                    {templates[index].attributes[i_a].pets[0].scheme ===
                                        "l-div-recursive" && (
                                            <label className="ms-2">
                                                c:
                                                <input
                                                    className="ms-2"
                                                    size="5"
                                                    name="c"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    required
                                                    value={templates[index].attributes[i_a].pets[0].metadata.c}
                                                    onChange={(e) =>
                                                        handleChangeObjectAttributeMetadata(e, "c", index, i_a)
                                                    }
                                                />
                                            </label>
                                        )}

                                    {templates[index].attributes[i_a].pets[0].scheme.includes(
                                        "t-clos"
                                    ) && (
                                            <label className="ms-2">
                                                t:
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="ms-2"
                                                    size="5"
                                                    name="t"
                                                    required
                                                    value={templates[index].attributes[i_a].pets[0].metadata.t}
                                                    onChange={(e) =>
                                                        handleChangeObjectAttributeMetadata(e, "t", index, i_a)
                                                    }
                                                />
                                            </label>
                                        )}

                                    {["generalization", "suppression"].some(
                                        (el) =>
                                            templates[index].attributes[i_a].pets[0].scheme === el
                                    ) && (
                                            <label className="ms-2">
                                                level:
                                                <input
                                                    className="ms-2"
                                                    size="5"
                                                    name="level"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    required
                                                    value={
                                                        templates[index].attributes[i_a].pets[0].metadata.level
                                                    }
                                                    onChange={(e) =>
                                                        handleChangeObjectAttributeMetadata(
                                                            e,
                                                            "level",
                                                            index,
                                                            i_a
                                                        )
                                                    }
                                                />
                                            </label>
                                        )}

                                    {/* Botón eliminar atributo */}
                                    <button
                                        className="btn btn-primary btn-sm ms-2"
                                        type="button"
                                        onClick={() => removeObjectAttribute(index, i_a)}
                                    >
                                        Delete attribute
                                    </button>
                                </div>
                            ))}

                            {/* Botones globales */}
                            <button
                                className="btn btn-primary btn-sm ms-2 mt-2"
                                type="button"
                                onClick={() => addObjectAttribute(index)}
                            >
                                Add attribute
                            </button>
                            <button
                                className="btn btn-secondary btn-sm ms-2 mt-2"
                                type="button"
                                onClick={addObject}
                            >
                                Add object
                            </button>
                            <button
                                className="btn btn-danger btn-sm ms-2 mt-2"
                                type="button"
                                onClick={() => removeObject(index)}
                            >
                                Delete object
                            </button>
                        </div>
                    ))}

                </form>

                <button type="submit" className="btn btn-primary btn-sm ms-1 mt-2 btn-privacy">
                    Generate privacy policy
                </button>
            </div>

        </section>
    );
}

export default PrivacyPolicy;
