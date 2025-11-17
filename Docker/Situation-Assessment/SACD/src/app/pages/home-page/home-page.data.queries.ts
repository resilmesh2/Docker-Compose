import { gql } from "apollo-angular";

export const QUERIES = {
    GET_SUBNETS: gql`
        {
            subnets {
                note,
                range,
            }
        }
    `,
    GET_ORG_UNITS: gql`
        {
            organizationUnits {
                name
            },
        }
    `,
    GET_IPS: gql`
        {
            ips {
                _id
            },
        }
    `,
    GET_CSA_NODES: gql`
        {
            nodeObjects {
                _id
            }
        }
    `,
    GET_MISSIONS: gql`
        {
            missions {
                _id
            }
        }
    `,
    GET_VULNERABILITIES: gql`
        {
            cves {
                cve_id
                cvss_v2 {
                    base_severity
                }
                cvss_v30 {
                base_severity
                }
                cvss_v31 {
                    base_severity
                }
                cvss_v40 {
                    base_severity
                }
            }
        }
    `,
    GET_OS_DATA: gql`
        {
            hosts {
                software_versions {
                    version
                }
            }
        }
    `,
}