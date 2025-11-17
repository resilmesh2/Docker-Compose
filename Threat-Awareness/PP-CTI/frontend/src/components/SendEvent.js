/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
 *
 * See LICENSE file in the project root for details.
 */

function SendEvent({
    useEventInput,
    setUseEventInput,
    selectedEventFile,
    setSelectedEventFile,
    generatePolicy,
    setGeneratePolicy,
    selectedPolicyFile,
    setSelectedPolicyFile,
    generateHierarchy,
    setGenerateHierarchy,
    selectedHierarchyFile,
    setSelectedHierarchyFile,
    handleCheckboxChange,
    handleFileChange,
    handleSendRequest,
}) {
    return (
        <section
            tabIndex={0}
            className="section d-flex flex-column p-3"
            style={{ gap: "3rem" }}
        >
            <div className="mt-4 text-center">
                <h5>Manual event anonymization</h5>

                {/* Contenedor flex centrado para las cajas */}
                <div className="d-flex justify-content-center flex-wrap gap-4 mt-3">
                    {/* Caja 1: Event */}
                    <div
                        className="border rounded p-3 d-flex flex-column align-items-center"
                        style={{ minWidth: "180px" }}
                    >
                        <h5>Event</h5>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="useEvent"
                                checked={useEventInput}
                                onChange={handleCheckboxChange(setUseEventInput)}
                            />
                            <label className="form-check-label" htmlFor="useEvent">
                                Send previously selected event
                            </label>
                        </div>
                        <div className="text-center my-2" style={{ color: "grey" }}>
                            or manually select
                        </div>
                        <input
                            id="event-selector"
                            type="file"
                            onChange={handleFileChange(setSelectedEventFile)}
                            disabled={useEventInput}
                            className="mt-2"
                        />
                    </div>

                    {/* Caja 2: Policy */}
                    <div
                        className="border rounded p-3 d-flex flex-column align-items-center"
                        style={{ minWidth: "180px" }}
                    >
                        <h5>Privacy policy</h5>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="genPolicy"
                                checked={generatePolicy}
                                onChange={handleCheckboxChange(setGeneratePolicy)}
                            />
                            <label className="form-check-label" htmlFor="genPolicy">
                                Send generated privacy policy
                            </label>
                        </div>
                        <div className="text-center my-2" style={{ color: "grey" }}>
                            or manually select
                        </div>
                        <input
                            id="policy-selector"
                            type="file"
                            onChange={handleFileChange(setSelectedPolicyFile)}
                            disabled={generatePolicy}
                            className="mt-2"
                        />
                    </div>

                    {/* Caja 3: Hierarchy */}
                    <div
                        className="border rounded p-3 d-flex flex-column align-items-center"
                        style={{ minWidth: "180px" }}
                    >
                        <h5>Hierarchy policy</h5>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="genHierarchy"
                                checked={generateHierarchy}
                                onChange={handleCheckboxChange(setGenerateHierarchy)}
                            />
                            <label className="form-check-label" htmlFor="genHierarchy">
                                Send generated hierarchy policy
                            </label>
                        </div>
                        <div className="text-center my-2" style={{ color: "grey" }}>
                            or manually select
                        </div>
                        <input
                            id="hierarchy-selector"
                            type="file"
                            onChange={handleFileChange(setSelectedHierarchyFile)}
                            disabled={generateHierarchy}
                            className="mt-2"
                        />
                    </div>
                </div>

                {/* Botón enviar al Anonymizer */}
                <button className="btn btn-primary btn-sm ms-1 mt-2 btn-privacy" onClick={handleSendRequest}>
                    Send
                </button>
            </div>
        </section>
    );
}

export default SendEvent;
