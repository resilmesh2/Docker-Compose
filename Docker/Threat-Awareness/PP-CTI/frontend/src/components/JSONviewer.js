/*
 * Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
 * (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
 *
 * See LICENSE file in the project root for details.
 */

import ReactJson from "react-json-view";

function JSONviewer({ jsonContent, handleFileChangePretty }) {
  return (
    <section
      tabIndex={0}
      className="section p-3 d-flex flex-column align-items-center gap-3 text-center"
      style={{ minHeight: "100%" }}
    >
        <h5>Event / Policy JSON viewer</h5>

      {/* selector centrado */}
      <input
        type="file"
        accept=".json"
        onChange={handleFileChangePretty}
        className="form-control form-control-sm mx-auto"
        style={{ maxWidth: "300px" }}
      />

      {jsonContent && (
        <div
          style={{
            marginTop: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "10px",
            backgroundColor: "#f9f9f9",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            overflow: "auto",
            width: "100%",
            maxWidth: "800px",
          }}
        >
          <h3>Contents:</h3>
          <ReactJson
            src={jsonContent}
            theme="rjv-default"
            collapsed={false}
            enableClipboard={true}
            displayDataTypes={false}
            displayObjectSize={true}
            indentWidth={4}
            style={{
              fontSize: "14px",
              fontFamily: "Consolas, monospace",
              textAlign: "left",
            }}
          />
        </div>
      )}
    </section>
  );
}

export default JSONviewer;
