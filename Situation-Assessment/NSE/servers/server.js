const express = require('express');
const path = require('path');
const neo4j = require('neo4j-driver');
const cors = require('cors');
require('dotenv').config();
const graphlib = require('graphlib');
const fs = require('fs');

// For CIDR operations
const CIDR = require('cidr-js');

// Single virtual network for all functionality
let virtualNetwork = new graphlib.Graph();

// Neo4j credentials
const uri = process.env.NEO4J_SERVER_URL || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'supertestovaciheslo';
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

const ISIM_API_BASE = (process.env.ISIM_API_URL || 'http://localhost:5000') + '/api';


// Initialize Express.js
const app = express();
const port = 3002;

app.use(express.static(path.join(__dirname, '../resilmesh-dashboard/src/assets')));
app.use(express.json());

app.use(cors({
    origin: '*',
    methods: 'GET,POST,PUT, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type,Authorization'
}));

// Single file path for virtual network cache
const virtualNetworkFilePath = path.join(__dirname, 'data', 'virtualNetwork.json');

// Configuration
const CACHE_MAX_AGE_HOURS = 24;

async function getInitialData() {
    console.log("====== Beginning Data Collection ======");
    console.time("Data Collection");
    
    const session = driver.session();

    try {
        console.log("Step 1: Attempting to fetch via OrganizationUnit nodes...");
        
        const orgQuery = `
        MATCH (o:OrganizationUnit)-[r]-(s:Subnet)
        WITH o, 
             id(o) as orgId,
             o.name as orgName,
             collect(DISTINCT {
                 range: s.range,
                 riskScore: s.\`Risk Score\`,
                 note: s.note,
                 id: id(s)
             }) as subnetData
        RETURN orgName, orgId, subnetData
        ORDER BY orgName
        `;

        const orgResult = await session.run(orgQuery);
        
        if (orgResult.records.length === 0) {
            console.log("No OrganizationUnit nodes found. Falling back to direct Subnet query...");
            
            const subnetQuery = `
            MATCH (s:Subnet)
            RETURN s.range as subnetRange,
                   s.\`Risk Score\` as riskScore,
                   s.note as note,
                   id(s) as subnetId
            ORDER BY s.range
            `;
            
            const subnetResult = await session.run(subnetQuery);
            
            if (subnetResult.records.length === 0) {
                console.log("No subnets found in database");
                console.timeEnd("Data Collection");
                return [];
            }
            
            console.log(`Found ${subnetResult.records.length} Subnet nodes directly`);
            
            const elements = [];
            let totalSubnetsWithRisk = 0;
            let totalRiskScore = 0;

            subnetResult.records.forEach((record, index) => {
                const subnetRange = record.get('subnetRange');
                const riskScore = record.get('riskScore');
                const note = record.get('note');
                const subnetId = record.get('subnetId').low;
                
                if (riskScore && riskScore > 0) {
                    totalSubnetsWithRisk++;
                    totalRiskScore += riskScore;
                }
                
                let details = null;
                if (riskScore && riskScore > 0) {
                    details = riskScore.toString();
                } else if (note) {
                    details = note;
                }
                
                console.log(`Processing subnet ${index + 1}: ${subnetRange} | Risk: ${riskScore || 0} | Note: ${note || 'none'}`);
                
                elements.push({
                    data: {
                        id: `subnet-${subnetRange}`,
                        type: 'Subnet',
                        label: subnetRange,
                        details: details,
                        'Risk Score': riskScore || 0,
                        riskScore: riskScore || 0,
                        note: note
                    }
                });
            });

            const avgRiskScore = totalSubnetsWithRisk > 0 ? 
                (totalRiskScore / totalSubnetsWithRisk) : 0;
            
            console.timeEnd("Data Collection");
            console.log(`====== Direct Subnet Collection Complete: ${subnetResult.records.length} subnets ======`);
            console.log(`====== ${totalSubnetsWithRisk} subnets have risk scores, Average: ${avgRiskScore.toFixed(2)} ======`);

            return elements;
        }

        console.log(`Found ${orgResult.records.length} OrganizationUnit nodes`);
        
        const elements = [];
        let totalSubnetsWithRisk = 0;
        let totalRiskScore = 0;

        orgResult.records.forEach((record, index) => {
            const orgName = record.get('orgName');
            const orgId = record.get('orgId').low;
            const subnetData = record.get('subnetData') || [];
            
            const subnetRanges = subnetData.map(s => s.range);
            const subnetsWithRisk = subnetData.filter(s => s.riskScore && s.riskScore > 0);
            totalSubnetsWithRisk += subnetsWithRisk.length;
            
            subnetsWithRisk.forEach(s => {
                totalRiskScore += s.riskScore;
            });
            
            console.log(`Processing org ${index + 1}: ${orgName} with ${subnetRanges.length} subnets (${subnetsWithRisk.length} have risk scores)`);
            
            elements.push({
                data: {
                    id: orgId,
                    type: 'Organization',
                    label: orgName,
                    details: subnetRanges,
                    vulns: [],
                    subnetCount: subnetRanges.length
                }
            });
            
            subnetData.forEach(subnet => {
                let details = null;
                if (subnet.riskScore && subnet.riskScore > 0) {
                    details = subnet.riskScore.toString();
                } else if (subnet.note) {
                    details = subnet.note;
                }
                
                elements.push({
                    data: {
                        id: `subnet-${subnet.range}`,
                        type: 'Subnet',
                        label: subnet.range,
                        details: details,
                        'Risk Score': subnet.riskScore || 0,
                        riskScore: subnet.riskScore || 0,
                        note: subnet.note
                    }
                });
            });
        });

        const avgRiskScore = totalSubnetsWithRisk > 0 ? 
            (totalRiskScore / totalSubnetsWithRisk) : 0;
        
        console.timeEnd("Data Collection");
        console.log(`====== Organization Collection Complete: ${orgResult.records.length} organizations ======`);
        console.log(`====== ${totalSubnetsWithRisk} subnets have risk scores, Average: ${avgRiskScore.toFixed(2)} ======`);

        return elements;

    } catch (error) {
        console.timeEnd("Data Collection");
        console.error('Error fetching data from Neo4j:', error);
        return [];
    } finally {
        await session.close();
    }
}

// Detailed subnet node queries
async function getInitialSubnetNode(netRange){
    const session = driver.session();

    try {
        let query = `MATCH (s:Subnet) WHERE s.range IN ["${netRange}"] RETURN s;`;
        const result = await session.run(query);
        const elements = [];
        let nodeId = null;
        let nodeType = 'Subnet';
        let nodeDetails = null;
        let nodeLabel = null;

        result.records.forEach(record => {
            record.keys.forEach(key => {
                const node = record.get(key);
                if (node && node.labels) {
                    nodeId = node.identity.low;
                    nodeDetails = node.properties.note;
                    nodeLabel = node.properties.range;
                }
            });
        });

        elements.push({
            data: {
                id: nodeId,
                type: nodeType,
                label: nodeLabel,
                details: nodeDetails
            }
        });

        return elements;
    } catch (error) {
        console.error('Error fetching initial subnet node from Neo4j:', error);
        return [];
    } finally {
        await session.close();
    }
}

// Neighbor node queries for expansion
async function getNeighborNodes(nodeId, nodeType, cidrNotation = '147.251.96.0/24') {
    const session = driver.session();
    const { baseNetwork, fullCIDR } = parseCIDR(cidrNotation);

    try {
        let query = '';

        if (nodeType === 'CIDR_Node') {
            query = `MATCH (o:OrganizationUnit) WHERE id(o) = $nodeId WITH o ` +
                `MATCH (o)-[r]-(s:Subnet) WHERE s.range CONTAINS $baseNetwork ` +
                `AND NOT s.range ENDS WITH $fullCIDR ` +
                `RETURN r, s;`;
        } else if (nodeType === 'Subnet') {
            query = `MATCH (s:Subnet)-[r]-(ip:IP) WHERE id(s) = $nodeId ` +
                `RETURN s, r, ip;`;
        } else if (nodeType === 'IP') {
            query = `MATCH (i:IP)-[r]-(d:DomainName), (i)-[r1]-(n:Node), (n)-[r2]-(h:Host), ` +
                `(h)-[r3]-(sv:SoftwareVersion) WHERE id(i) = $nodeId WITH r, d, r1, n, r2, h, r3, sv ` +
                `LIMIT 1 ` +
                `OPTIONAL MATCH (sv)-[sR1]-(ns:NetworkService) ` +
                `OPTIONAL MATCH (sv)-[sR2]-(v:Vulnerability) ` +
                `OPTIONAL MATCH (v)-[vulnR]-(c:CVE) ` +
                `RETURN r, d, r1, n, r2, h, r3, sv, sR1, ns, sR2, v, vulnR, c ` +
                `LIMIT 1;`;
        }

        if (!query) {
            throw new Error('Cypher query is empty');
        }

        const result = await session.run(query, {
            nodeId: parseInt(nodeId),
            nodeType: nodeType,
            baseNetwork: baseNetwork,
            fullCIDR: fullCIDR
        });

        const elements = [];
        result.records.forEach(record => {
            record.keys.forEach(key => {
                const node = record.get(key);

                if (node) {
                    if (!node.type) {
                        const nodeID = node.identity['low'];
                        const nodeType = node.labels[0];
                        const nodeProperty = node.properties;
                        const { nodeLabel, nodeDetails } = getNodeData(nodeType, nodeProperty);

                        elements.push({
                            data: {
                                id: nodeID,
                                type: nodeType,
                                label: nodeLabel,
                                details: nodeDetails
                            }
                        });

                        virtualNetwork.setNode(nodeID, { label: nodeLabel, type: nodeType, details: nodeDetails });
                    } else {
                        const edgeSource = node.start['low'];
                        const edgeTarget = node.end['low'];
                        const edgeType = node.type;
                        const edgeID = `${edgeSource}-${edgeTarget}`;

                        elements.push({
                            data: {
                                id: edgeID,
                                source: edgeSource,
                                target: edgeTarget,
                                label: edgeType
                            }
                        });

                        virtualNetwork.setEdge(edgeSource, edgeTarget, { id: edgeID, type: edgeType });
                    }
                }
            });
        });

        return elements;
    } catch (error) {
        console.error('Error fetching neighbors from Neo4j:', error);
        return [];
    } finally {
        await session.close();
    }
}

// Helper functions
function getNodeData(nodeType, nodeProperty){
    let nodeLabel, nodeDetails;

    switch (nodeType) {
       case 'Subnet':
        nodeLabel = nodeProperty.range;
        const subnetRiskScore = nodeProperty['Risk Score'] || nodeProperty.riskScore || nodeProperty.risk_score;
        if (subnetRiskScore !== undefined && subnetRiskScore !== null) {
            nodeDetails = subnetRiskScore.toFixed(1);
        } else {
            nodeDetails = nodeProperty.note || 'N/A';
        }
        break;
       case 'IP':
           nodeLabel = nodeProperty.address || 'N/A';
           nodeDetails = null
           break;
       case 'DomainName':
           nodeLabel = nodeProperty.domain_name || 'N/A';
           nodeDetails = nodeProperty.tag || 'N/A';
           break;
       case 'Node':
       const riskScore = nodeProperty['Risk Score'] || nodeProperty.riskScore || nodeProperty.risk_score || 0;
       nodeLabel = riskScore.toFixed(1);
       nodeDetails = (nodeProperty.topology_betweenness || 0).toFixed(1);
       break;
       case 'Host':
           nodeLabel = 'Host';
           nodeDetails = null;
           break;
       case 'SoftwareVersion':
           nodeLabel = nodeProperty.version || 'N/A';
           nodeDetails = nodeProperty.tag || 'N/A';
           break;
       case 'NetworkService':
           nodeLabel = nodeProperty.protocol || 'N/A';
           nodeDetails = nodeProperty.service || 'N/A';
           break;
       case 'Vulnerability':
           nodeLabel = 'Vulnerability';
           nodeDetails = nodeProperty.description || 'N/A';
           break;
       case 'CVE':
           nodeLabel = nodeProperty.impact[0] || 'N/A';
           nodeDetails = (nodeProperty.base_score_v3 || 0).toFixed(1);
           break;
    }

    return { nodeLabel, nodeDetails };
}

function parseCIDR(cidrNotation) {
    const [network, mask] = cidrNotation.split('/');
    const octets = network.split('.');
    const baseNetwork = `${octets[0]}.${octets[1]}.${octets[2]}.`;
    return {
        network: network,
        mask: mask,
        baseNetwork: baseNetwork,
        fullCIDR: cidrNotation
    };
}

// Virtual network management
async function populateVirtualNetwork(data) {
    if (Array.isArray(data)) {
        data.forEach(element => {
            const { id, source, target, label, type, parent, details, hosts, vulns } = element.data;

            if (source !== undefined && target !== undefined) {
                virtualNetwork.setEdge(
                    String(source),
                    String(target),
                    {
                        id: String(id),
                        type: label
                    }
                );
            } else if (id !== undefined && type) {
                const nodeData = { label, type, details, hosts, vulns };
                if (parent) nodeData.parent = parent;
                virtualNetwork.setNode(String(id), nodeData);
            }
        });
    }
}

async function getVirtualNetworkData() {
    try {
        const elements = [];
        const subnetDeviceData = {}; // Track which subnets have device data

        virtualNetwork.nodes().forEach(nodeId => {
            const node = virtualNetwork.node(nodeId);
            const nodeData = {
                id: nodeId,
                label: node.label,
                type: node.type,
                details: node.details,
                hosts: node.hosts,
                vulns: node.vulns
            };

            if (node.parent) {
                nodeData.parent = node.parent;
            }
            
            // Include device data if it exists
            if (node.deviceData) {
                nodeData.deviceData = node.deviceData;
            }

            // Track subnets that have associated device data
            if (node.type === 'IP' && node.deviceData) {
                const ipAddress = node.label;
                const subnetPrefix = ipAddress.split('.').slice(0, 3).join('.') + '.0/24';
                
                if (!subnetDeviceData[subnetPrefix]) {
                    subnetDeviceData[subnetPrefix] = {
                        deviceCount: 0,
                        devices: [],
                        hasRiskScores: false,
                        totalRiskScore: 0
                    };
                }
                
                subnetDeviceData[subnetPrefix].deviceCount++;
                subnetDeviceData[subnetPrefix].devices.push(node.deviceData);
                
                if (node.deviceData.hasRiskScore) {
                    subnetDeviceData[subnetPrefix].hasRiskScores = true;
                    subnetDeviceData[subnetPrefix].totalRiskScore += node.deviceData.riskScore;
                }
            }

            elements.push({ data: nodeData });
        });

        virtualNetwork.edges().forEach(edge => {
            elements.push({
                data: {
                    id: virtualNetwork.edge(edge).id,
                    source: edge.v,
                    target: edge.w,
                    label: virtualNetwork.edge(edge).type,
                }
            });
        });

        // Add subnet device summary to the response
        const enrichedElements = elements.map(element => {
            if (element.data.type === 'CIDR_Values') {
                return {
                    ...element,
                    data: {
                        ...element.data,
                        subnetDeviceData: subnetDeviceData
                    }
                };
            }
            return element;
        });

        return enrichedElements;
    } catch (error) {
        console.error('Error sending virtual network data:', error);
        return [];
    }
}

// Cache management
function saveVirtualNetwork() {
    try {
        const serializedGraph = graphlib.json.write(virtualNetwork);
        if (!fs.existsSync(path.dirname(virtualNetworkFilePath))) {
            fs.mkdirSync(path.dirname(virtualNetworkFilePath), { recursive: true });
        }
        fs.writeFileSync(virtualNetworkFilePath, JSON.stringify(serializedGraph, null, 2));
        console.log(`Virtual network saved at ${new Date().toISOString()}`);
    } catch (error) {
        console.error('Error saving virtual network:', error);
    }
}

async function loadVirtualNetwork() {
    try {
        if (fs.existsSync(virtualNetworkFilePath)) {
            const stats = fs.statSync(virtualNetworkFilePath);
            const ageHours = (Date.now() - stats.mtime) / (1000 * 60 * 60);
            
            console.log(`Virtual network cache age: ${ageHours.toFixed(1)} hours`);
            
            if (ageHours > CACHE_MAX_AGE_HOURS) {
                console.log(`Cache is older than ${CACHE_MAX_AGE_HOURS} hours, deleting stale data...`);
                fs.unlinkSync(virtualNetworkFilePath);
                virtualNetwork = new graphlib.Graph();
                console.log('Fetching fresh data from Neo4j...');
                const initialData = await getInitialData();
                await populateVirtualNetwork(initialData);
                saveVirtualNetwork();
            } else {
                const data = fs.readFileSync(virtualNetworkFilePath, 'utf-8');
                if (data) {
                    virtualNetwork = graphlib.json.read(JSON.parse(data));
                    console.log('Fresh virtual network loaded from cache.');
                }
            }
        } else {
            console.log('No virtual network cache found, initializing new network.');
            virtualNetwork = new graphlib.Graph();
        }
    } catch (error) {
        console.error('Error loading virtual network:', error);
        virtualNetwork = new graphlib.Graph();
    }
}

// CIDR Treemap function
async function buildCIDRTreemap(supernet, cidrDict) {
    const IPCIDR = await import('ip-cidr');
    
    const treemap = {
        [supernet]: {
            cidr: supernet,
            label: 'my_pool',
            children: [],
        },
    };

    const startSuffix = parseInt(supernet.split('/')[1], 10);
    const endSuffix = 31;

    function createSubnets(cidr, suffix) {
        const cidrObj = new IPCIDR.default(cidr);

        if (!cidrObj.address.isCorrect()) {
            throw new Error(`Invalid CIDR: ${cidr}`);
        }

        const subnetMask = parseInt(cidr.split('/')[1], 10);

        if (suffix < subnetMask) {
            throw new Error(`Invalid suffix: ${suffix} cannot be smaller than ${subnetMask}`);
        }

        const subnetList = [];
        const startIP = cidrObj.start();
        const totalSubnets = 2 ** (suffix - subnetMask);

        for (let i = 0; i < totalSubnets; i++) {
            const offsetIP = incrementIP(startIP, i * (2 ** (32 - suffix)));
            subnetList.push(`${offsetIP}/${suffix}`);
        }

        return subnetList;
    }

    function incrementIP(ip, increment) {
        const parts = ip.split('.').map(Number);
        let value = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
        value += increment;

        return [
            (value >>> 24) & 255,
            (value >>> 16) & 255,
            (value >>> 8) & 255,
            value & 255,
        ].join('.');
    }

    function generateNestedSubnets(supernet, startSuffix, endSuffix) {
        const result = [];
        const cidrSuffixes = [];
        let currentSubnets = [supernet];

        for (let suffix = startSuffix; suffix <= endSuffix; suffix++) {
            const nextLevelSubnets = [];
            currentSubnets.forEach((cidr) => {
                const subnets = createSubnets(cidr, suffix);
                nextLevelSubnets.push(...subnets);
            });

            result.push(...nextLevelSubnets);
            let suffixStr = String(suffix);
            cidrSuffixes.push(suffixStr);
            currentSubnets = nextLevelSubnets;
        }

        return { allSubnets: result, cidrSuffixes };
    }

    const { allSubnets, cidrSuffixes } = generateNestedSubnets(supernet, startSuffix, endSuffix);
    const newLabel = 'my_pool';

    allSubnets.forEach(sub => {
        if (!cidrDict.hasOwnProperty(sub)) {
            cidrDict[sub] = {
                value: sub,
                label: newLabel,
            };
        }
    });

    function isInSubnet(child, parent) {
        const parentCidr = new IPCIDR.default(parent);
        const childCidr = new IPCIDR.default(child);
        const parentRange = parentCidr.toRange();
        const childRange = childCidr.toRange();
        const [parentStart, parentEnd] = parentRange.map(ip => ip2long(ip));
        const [childStart, childEnd] = childRange.map(ip => ip2long(ip));
        return childStart >= parentStart && childEnd <= parentEnd;
    }

    function ip2long(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
    }

    function insertIntoTree(node, cidr, label, vuln) {
        let mostSpecificParent = null;

        for (const child of node.children) {
            if (isInSubnet(cidr, child.cidr)) {
                if (
                    !mostSpecificParent ||
                    new IPCIDR.default(child.cidr).prefixLength >
                    new IPCIDR.default(mostSpecificParent.cidr).prefixLength
                ) {
                    mostSpecificParent = child;
                }
            }
        }

        if (mostSpecificParent) {
            insertIntoTree(mostSpecificParent, cidr, label, vuln);
        } else {
            node.children.push({ cidr, label, vuln, children: [] });
        }
    }

    delete cidrDict[supernet];

    const sortedCIDRDictEntries = Object.entries(cidrDict).sort(([keyA], [keyB]) => {
        const getSuffix = (cidr) => parseInt(cidr.split('/')[1], 10);
        const getFourthOctet = (cidr) => parseInt(cidr.split('.')[3].split('/')[0], 10);
        const getThirdOctet = (cidr) => parseInt(cidr.split('.')[2], 10);

        const suffixA = getSuffix(keyA);
        const suffixB = getSuffix(keyB);

        if (suffixA !== suffixB) {
            return suffixA - suffixB;
        }

        const thirdOctetA = getThirdOctet(keyA);
        const thirdOctetB = getThirdOctet(keyB);

        if (thirdOctetA === thirdOctetB) {
            const fourthOctetA = getFourthOctet(keyA);
            const fourthOctetB = getFourthOctet(keyB);
            return fourthOctetA - fourthOctetB;
        }

        return thirdOctetA - thirdOctetB;
    });

    for (const [cidr, { value, label, vuln }] of sortedCIDRDictEntries) {
        if (isInSubnet(value, supernet)) {
            insertIntoTree(treemap[supernet], value, label, vuln);
        }
    }

    const result = {};
    for (const child of treemap[supernet].children) {
        result[child.cidr] = { ...child };
        delete child.cidr;
    }

    return { treemap: result, cidrSuffixes };
}

// Collapse function for virtual network
async function collapseVirtualNetwork(expandedData) {
    expandedData.forEach(element => {
        const { id, source, target, label, type, parent, details } = element.data;

        if (source !== undefined && target !== undefined) {
            if (virtualNetwork.hasEdge(String(source), String(target))) {
                virtualNetwork.removeEdge(String(source), String(target));
            }
        } else if (id !== undefined) {
            if (virtualNetwork.hasNode(String(id))) {
                virtualNetwork.removeNode(String(id));
            }
        }
    });
}

// Network data endpoints
app.get('/api/fetch-cidr-data', async (req, res) => {
    try {
        const initialData = await getInitialData();
        await populateVirtualNetwork(initialData);
        saveVirtualNetwork();
        res.json({ message: 'Initial CIDR range fetched and virtual network saved.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch initial CIDR data.' });
    }
});

app.get('/api/get-virtual-network-data', async (req, res) => {
    try {
        const data = await getVirtualNetworkData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching virtual network data:', error);
        res.status(500).json({ error: 'Failed to fetch virtual network data' });
    }
});

app.post('/api/build-cidr-treemap', async (req, res) => {
    const { supernet, cidrDict } = req.body;
    try {
        const { treemap, cidrSuffixes } = await buildCIDRTreemap(supernet, cidrDict);
        res.json({ treemap, cidrSuffixes });
    } catch (error) {
        console.error('Error building CIDR treemap:', error);
        res.status(500).json({ error: 'Failed to build CIDR treemap.' });
    }
});

// Detailed network endpoints
app.get('/api/fetch-subnet-data', async (req, res) => {
    const { netRange } = req.query;
    if (!netRange) {
        return res.status(400).json({ error: 'netRange is required' });
    }
    try {
        const data = await getInitialSubnetNode(netRange);
        await populateVirtualNetwork(data);
        saveVirtualNetwork();
        res.status(200).json({ message: 'Subnet data fetched', data });
    } catch (error) {
        console.error('Error fetching subnet data:', error);
        res.status(500).json({ error: 'Failed to fetch subnet data' });
    }
});

app.post('/api/expand-virtual-network/:nodeId/:nodeType', async (req, res) => {
    try {
        const { nodeId, nodeType } = req.params;
        const { cidrNotation = '147.251.96.0/24' } = req.body;
        
        console.log(`Expanding node ${nodeId} of type ${nodeType} for network ${cidrNotation}`);
        
        const expandedData = await getNeighborNodes(nodeId, nodeType, cidrNotation);
        
        if (nodeType === 'IP'){
            const compoundId = `compound-${nodeId}`;
            const vulnerabilityCompoundId = `vulnerability-compound-${nodeId}`;
            let hasVulnerabilityData = false;

            expandedData.forEach(element => {
                const { type } = element.data;
                if (type === 'Vulnerability' || type === 'NetworkService' || type === 'CVE') {
                    hasVulnerabilityData = true;
                }
            });

            expandedData.forEach(element => {
                const { type, id, source } = element.data;
                if (id === nodeId || type === 'IP' || source !== undefined) return;

                if (hasVulnerabilityData && (type === 'Vulnerability' || type === 'NetworkService'
                    || type === 'CVE' || type === 'SoftwareVersion')) {
                    element.data.parent = vulnerabilityCompoundId;
                } else {
                    element.data.parent = compoundId;
                }
            });

            if (hasVulnerabilityData) {
                expandedData.push({
                    data: {
                        id: vulnerabilityCompoundId,
                        type: 'Compound',
                        label: `Vulnerability Compound for ${nodeId}`,
                        details: null,
                        parent: compoundId
                    }
                });
            }

            expandedData.push({
                data: {
                    id: compoundId,
                    type: "Compound",
                    details: null,
                    label: `Compound Node for ${nodeId}`
                }
            });
        }

        await populateVirtualNetwork(expandedData);
        await saveVirtualNetwork();
        
        const updatedElements = await getVirtualNetworkData();
        
        res.json({
            message: 'Virtual network expanded successfully',
            nodeId: nodeId,
            nodeType: nodeType,
            cidrNotation: cidrNotation,
            elements: updatedElements,
            totalNodes: virtualNetwork.nodeCount(),
            totalEdges: virtualNetwork.edgeCount()
        });
    } catch (error) {
        console.error('Error expanding virtual network:', error);
        res.status(500).json({ error: 'Failed to expand virtual network' });
    }
});

app.get('/api/expand-virtual-network/:nodeId/:nodeType', async (req, res) => {
    try {
        const nodeId = req.params.nodeId;
        const nodeType = req.params.nodeType;
        
        const expandedData = await getNeighborNodes(nodeId, nodeType);
        
        if (nodeType === 'IP'){
            const compoundId = `compound-${nodeId}`;
            const vulnerabilityCompoundId = `vulnerability-compound-${nodeId}`;
            let hasVulnerabilityData = false;

            expandedData.forEach(element => {
                const { type } = element.data;
                if (type === 'Vulnerability' || type === 'NetworkService' || type === 'CVE') {
                    hasVulnerabilityData = true;
                }
            });

            expandedData.forEach(element => {
                const { type, id, source } = element.data;
                if (id === nodeId || type === 'IP' || source !== undefined) return;

                if (hasVulnerabilityData && (type === 'Vulnerability' || type === 'NetworkService'
                    || type === 'CVE' || type === 'SoftwareVersion')) {
                    element.data.parent = vulnerabilityCompoundId;
                } else {
                    element.data.parent = compoundId;
                }
            });

            if (hasVulnerabilityData) {
                expandedData.push({
                    data: {
                        id: vulnerabilityCompoundId,
                        type: 'Compound',
                        label: `Vulnerability Compound for ${nodeId}`,
                        details: null,
                        parent: compoundId
                    }
                });
            }

            expandedData.push({
                data: {
                    id: compoundId,
                    type: "Compound",
                    details: null,
                    label: `Compound Node for ${nodeId}`
                }
            });
        }

        await populateVirtualNetwork(expandedData);
        await saveVirtualNetwork();
        res.json({ message: `Neighbor data for ${nodeId} fetched and virtual network saved.` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch neighbor data.' });
    }
});

// Direct subnet data retrieval
app.get('/api/get-subnet-devices/:subnetCidr', async (req, res) => {
  const { subnetCidr } = req.params;
  const session = driver.session();
  
  try {
    console.log(`Direct query for subnet devices: ${subnetCidr}`);
    
    const networkPrefix = subnetCidr.split('/')[0].split('.').slice(0, 3).join('.');
    
    const query = `
      MATCH (subnet:Subnet {range: $subnetCidr})
      OPTIONAL MATCH (subnet)<-[:PART_OF]-(ip:IP)
      WHERE ip.address STARTS WITH $networkPrefix + '.'
      OPTIONAL MATCH (ip)<-[:HAS_ASSIGNED]-(node:Node)
      OPTIONAL MATCH (node)-[:IS_A]->(host:Host)
      OPTIONAL MATCH (ip)-[:RESOLVES_TO]->(domain:DomainName)
      OPTIONAL MATCH (host)<-[:ON]-(software:SoftwareVersion)
      OPTIONAL MATCH (software)<-[:IN]-(vuln:Vulnerability)
      OPTIONAL MATCH (vuln)-[:REFERS_TO]->(cve:CVE)
      RETURN 
        subnet,
        ip,
        node,
        host,
        domain,
        collect(DISTINCT software) as software_versions,
        collect(DISTINCT vuln) as vulnerabilities,
        collect(DISTINCT cve) as cves
      ORDER BY ip.address
    `;
    
    const result = await session.run(query, {
      subnetCidr: subnetCidr,
      networkPrefix: networkPrefix
    });
    
    const devices = [];
    const processedIPs = new Set();
    let subnetInfo = null;
    
    result.records.forEach(record => {
      const subnet = record.get('subnet');
      const ip = record.get('ip');
      const node = record.get('node');
      const host = record.get('host');
      const domain = record.get('domain');
      const software_versions = record.get('software_versions') || [];
      const vulnerabilities = record.get('vulnerabilities') || [];
      const cves = record.get('cves') || [];
      
      if (subnet && !subnetInfo) {
        subnetInfo = {
          range: subnet.properties.range,
          riskScore: subnet.properties['Risk Score'] || 0,
          note: subnet.properties.note || ''
        };
        
        // Update virtual network with subnet node if not exists
        const subnetNodeId = subnet.identity.low.toString();
        if (!virtualNetwork.hasNode(subnetNodeId)) {
          virtualNetwork.setNode(subnetNodeId, {
            label: subnet.properties.range,
            type: 'Subnet',
            details: subnet.properties['Risk Score'] ? subnet.properties['Risk Score'].toString() : (subnet.properties.note || 'N/A')
          });
        }
      }
      
      if (ip && !processedIPs.has(ip.properties.address)) {
        processedIPs.add(ip.properties.address);
        
        const device = {
          id: `device-${ip.identity.low}`,
          ip: ip.properties.address,
          hostname: '',
          deviceType: 'Network Device',
          os: 'Unknown',
          riskScore: 0,
          vulnerabilities: [],
          hasRiskScore: false
        };

        if (domain && domain.properties && domain.properties.domain_name) {
          device.hostname = String(domain.properties.domain_name);
        } else {
          device.hostname = `host-${ip.properties.address.split('.').pop()}`;
        }

        if (node && node.properties && node.properties['Risk Score']) {
          device.riskScore = parseFloat(node.properties['Risk Score']);
          device.hasRiskScore = true;
        } else {
          device.riskScore = 0;
          device.hasRiskScore = false;
        }

        if (software_versions.length > 0) {
          const firstSoftware = software_versions[0];
          if (firstSoftware && firstSoftware.properties) {
            device.os = extractOSFromSoftware(firstSoftware.properties.version || firstSoftware.properties.tag || '');
          }
        }

        const vulnList = [];
        if (cves.length > 0) {
          cves.forEach(cve => {
            if (cve && cve.properties) {
              const cveId = cve.properties.cve_id || cve.properties.identifier || `CVE-${cve.identity.low}`;
              vulnList.push(cveId);
            }
          });
        }
        if (vulnerabilities.length > 0) {
          vulnerabilities.forEach(vuln => {
            if (vuln && vuln.properties) {
              const vulnDesc = vuln.properties.description || vuln.properties.name || `Vulnerability-${vuln.identity.low}`;
              vulnList.push(vulnDesc);
            }
          });
        }
        device.vulnerabilities = vulnList;

        const hostnameStr = String(device.hostname || '').toLowerCase();
        if (hostnameStr.includes('win-')) {
          device.deviceType = 'Windows Workstation';
          device.os = 'Windows';
        } else if (hostnameStr.includes('server')) {
          device.deviceType = 'Server';
        } else if (hostnameStr.includes('linux')) {
          device.deviceType = 'Linux Server';
          device.os = 'Linux';
        }

        device.openPorts = generatePortsForDevice(device.deviceType, device.os);
        device.lastSeen = getRandomRecentDate();
        device.status = getRandomStatus();
        
        devices.push(device);
        
        // Add nodes to virtual network graph
        const ipNodeId = ip.identity.low.toString();
        if (!virtualNetwork.hasNode(ipNodeId)) {
          virtualNetwork.setNode(ipNodeId, {
            label: ip.properties.address,
            type: 'IP',
            details: null,
            deviceData: device // Store device data in the node
          });
        }
        
        if (node) {
          const nodeId = node.identity.low.toString();
          if (!virtualNetwork.hasNode(nodeId)) {
            const riskScore = node.properties['Risk Score'] || 0;
            virtualNetwork.setNode(nodeId, {
              label: riskScore.toString(),
              type: 'Node',
              details: (node.properties.topology_betweenness || 0).toString()
            });
          }
          
          // Add edge between IP and Node if not exists
          if (!virtualNetwork.hasEdge(ipNodeId, nodeId)) {
            virtualNetwork.setEdge(ipNodeId, nodeId, {
              id: `${ipNodeId}-${nodeId}`,
              type: 'HAS_ASSIGNED'
            });
          }
        }
        
        if (domain) {
          const domainNodeId = domain.identity.low.toString();
          if (!virtualNetwork.hasNode(domainNodeId)) {
            virtualNetwork.setNode(domainNodeId, {
              label: domain.properties.domain_name || 'N/A',
              type: 'DomainName',
              details: domain.properties.tag || 'N/A'
            });
          }
          
          // Add edge between IP and Domain if not exists
          if (!virtualNetwork.hasEdge(ipNodeId, domainNodeId)) {
            virtualNetwork.setEdge(ipNodeId, domainNodeId, {
              id: `${ipNodeId}-${domainNodeId}`,
              type: 'RESOLVES_TO'
            });
          }
        }
      }
    });
    
    // Save the updated virtual network to JSON file
    saveVirtualNetwork();
    
    console.log(`Found ${devices.length} devices for subnet ${subnetCidr} and updated virtual network cache`);
    
    res.json({
        subnet: subnetCidr,
        subnetRiskScore: subnetInfo ? parseFloat(subnetInfo.riskScore) : 0,
        subnetInfo: subnetInfo,
        devices: devices,
        deviceCount: devices.length,
        vulnerabilities: [...new Set(devices.flatMap(d => d.vulnerabilities))]
    });
    
  } catch (error) {
    console.error('Error fetching subnet devices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subnet devices',
      details: error.message,
      subnet: subnetCidr,
      devices: [],
      deviceCount: 0,
      vulnerabilities: []
    });
  } finally {
    await session.close();
  }
});

function extractOSFromSoftware(softwareLabel) {
  if (!softwareLabel) return 'Unknown';
  
  const lower = softwareLabel.toLowerCase();
  
  if (lower.includes('windows_10') || lower.includes('win-10')) return 'Windows 10';
  if (lower.includes('windows_server_2019')) return 'Windows Server 2019';
  if (lower.includes('windows_server_2016')) return 'Windows Server 2016';
  if (lower.includes('windows_server')) return 'Windows Server';
  if (lower.includes('windows') || lower.includes('win-')) return 'Windows';
  if (lower.includes('ubuntu')) return 'Ubuntu Linux';
  if (lower.includes('centos')) return 'CentOS Linux';
  if (lower.includes('redhat')) return 'Red Hat Linux';
  if (lower.includes('linux')) return 'Linux';
  if (lower.includes('macos')) return 'macOS';
  
  return 'Unknown';
}

function determineDeviceType(os, hostname) {
  const osLower = String(os || '').toLowerCase();
  const hostLower = String(hostname || '').toLowerCase();
  
  if (hostLower.includes('server') || hostLower.includes('srv')) return 'Server';
  if (hostLower.includes('win-') && !hostLower.includes('server')) return 'Windows Workstation';
  if (hostLower.includes('router') || hostLower.includes('gw')) return 'Router';
  if (hostLower.includes('switch') || hostLower.includes('sw')) return 'Switch';
  if (hostLower.includes('printer')) return 'Printer';
  if (hostLower.includes('firewall') || hostLower.includes('fw')) return 'Firewall';
  
  if (osLower.includes('server')) return 'Server';
  if (osLower.includes('windows') && !osLower.includes('server')) return 'Workstation';
  if (osLower.includes('linux') || osLower.includes('ubuntu') || osLower.includes('centos')) return 'Server';
  
  return 'Network Device';
}

function generatePortsForDevice(deviceType, os) {
  const basePortsByType = {
    'Server': [22, 80, 443, 3389, 21, 25, 993, 995, 143, 110],
    'Windows Workstation': [3389, 135, 139, 445, 5985],
    'Web Server': [80, 443, 8080, 8443, 22],
    'Mail Server': [25, 143, 993, 995, 587, 110, 22],
    'Database Server': [3306, 5432, 1433, 1521, 27017, 22],
    'Workstation': [22, 3389, 5985, 135, 139, 445],
    'Router': [22, 23, 80, 443, 161, 162],
    'Switch': [22, 23, 80, 443, 161, 162],
    'Firewall': [22, 443, 161, 162],
    'Printer': [80, 443, 515, 631, 9100],
    'Network Device': [22, 80, 443, 161]
  };
  
  let basePorts = basePortsByType[deviceType] || basePortsByType['Network Device'];
  
  const osLower = (os || '').toLowerCase();
  if (osLower.includes('windows')) {
    basePorts = [...basePorts, 135, 139, 445, 3389, 5985];
  } else if (osLower.includes('linux') || osLower.includes('ubuntu') || osLower.includes('centos')) {
    basePorts = [...basePorts, 22, 80, 443];
  }
  
  const uniquePorts = [...new Set(basePorts)];
  const numPorts = Math.min(Math.max(3, Math.floor(Math.random() * 5) + 3), uniquePorts.length);
  return uniquePorts.slice(0, numPorts).sort((a, b) => a - b);
}

function getRandomRecentDate() {
  const now = new Date();
  const hoursAgo = Math.floor(Math.random() * 168);
  
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}

function getRandomStatus() {
  const statuses = ['Online', 'Online', 'Online', 'Offline'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

app.post('/api/collapse-virtual-network', async (req, res) => {
    try {
        const data = req.body;
        console.log(`Collapsing ${data.length} elements from virtual network`);
        
        await collapseVirtualNetwork(data);
        await saveVirtualNetwork();
        
        console.log('Virtual network collapsed and saved');
        
        res.json({ 
            message: 'Virtual network collapsed and saved successfully',
            elementsRemoved: data.length,
            remainingNodes: virtualNetwork.nodeCount(),
            remainingEdges: virtualNetwork.edgeCount()
        });
    } catch (error) {
        console.error('Error collapsing virtual network:', error);
        res.status(500).json({ error: 'Failed to collapse virtual network' });
    }
});

// Debug endpoints
app.get('/api/debug-node-properties', async (req, res) => {
    const session = driver.session();
    
    try {
        const query = `
        MATCH (n:Node)
        RETURN n
        LIMIT 10
        `;
        
        const result = await session.run(query);
        const nodeProperties = [];
        
        result.records.forEach((record, index) => {
            const node = record.get('n');
            const props = node.properties;
            nodeProperties.push({
                nodeIndex: index,
                nodeId: node.identity.toNumber(),
                properties: Object.keys(props),
                propertyValues: props
            });
        });

        const allKeysQuery = `
        MATCH (n:Node)
        WITH n
        UNWIND keys(n) as key
        RETURN DISTINCT key, count(*) as nodeCount
        ORDER BY nodeCount DESC
        `;
        
        const allKeysResult = await session.run(allKeysQuery);
        const allUniqueKeys = allKeysResult.records.map(record => ({
            property: record.get('key'),
            nodeCount: record.get('nodeCount').toNumber()
        }));

        res.json({
            sampleNodes: nodeProperties,
            allUniqueProperties: allUniqueKeys,
            totalSampleNodes: nodeProperties.length
        });

    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Failed to debug node properties', details: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/debug-ip-targeting', async (req, res) => {
    const session = driver.session();
    
    try {
        const query = `
        MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
        WHERE n.\`Risk Score\` IS NOT NULL
        RETURN ip.address as ipAddress, subnet.range as subnetRange, n.\`Risk Score\` as riskScore
        LIMIT 10
        `;
        
        const result = await session.run(query);
        const ips = result.records.map(record => ({
            ip: record.get('ipAddress'),
            subnet: record.get('subnetRange'),
            riskScore: record.get('riskScore')
        }));

        res.json({
            message: 'Sample IPs with Node connections',
            ips: ips,
            count: ips.length
        });

    } catch (error) {
        console.error('Error in IP debug endpoint:', error);
        res.status(500).json({ error: 'Failed to get IP debug info', details: error.message });
    } finally {
        await session.close();
    }
});

// Node attributes endpoint
app.get('/api/get-node-attributes', async (req, res) => {
    const session = driver.session();
    
    try {
        console.log('Fetching node attributes...');
        
        const allKeysQuery = `
        MATCH (n:Node)
        WITH n
        UNWIND keys(n) as key
        RETURN DISTINCT key, count(*) as nodeCount
        ORDER BY nodeCount DESC
        `;
        
        const allKeysResult = await session.run(allKeysQuery);
        console.log(`Found ${allKeysResult.records.length} unique properties on Node objects`);
        
        const allProperties = {};
        const knownSystemProperties = [
            'id', 'created', 'updated', 'name', 'label', 'type', 'status'
        ];
        
        for (const record of allKeysResult.records) {
            const propKey = record.get('key');
            const nodeCount = record.get('nodeCount').toNumber();
            
            console.log(`Processing property: ${propKey} (${nodeCount} nodes)`);
            
            if (knownSystemProperties.includes(propKey)) {
                console.log(`Skipping system property: ${propKey}`);
                continue;
            }
            
            try {
                const statsQuery = `
                MATCH (n:Node)
                WHERE n.${propKey.includes(' ') ? '`' + propKey + '`' : propKey} IS NOT NULL
                AND toString(n.${propKey.includes(' ') ? '`' + propKey + '`' : propKey}) =~ '^-?[0-9]*\\.?[0-9]+$'
                WITH toFloat(n.${propKey.includes(' ') ? '`' + propKey + '`' : propKey}) as numValue
                WHERE numValue IS NOT NULL
                RETURN 
                    avg(numValue) as avgValue,
                    max(numValue) as maxValue,
                    min(numValue) as minValue,
                    count(numValue) as numericCount
                `;
                
                const statsResult = await session.run(statsQuery);
                
                if (statsResult.records.length > 0) {
                    const statsRecord = statsResult.records[0];
                    const numericCount = statsRecord.get('numericCount').toNumber();
                    
                    if (numericCount > 0) {
                        allProperties[propKey] = {
                            avg: statsRecord.get('avgValue'),
                            max: statsRecord.get('maxValue'),
                            min: statsRecord.get('minValue'),
                            nodeCount: numericCount,
                            totalNodes: nodeCount
                        };
                        console.log(`✅ ${propKey}: avg=${allProperties[propKey].avg?.toFixed(2)}, max=${allProperties[propKey].max?.toFixed(2)}, nodes=${numericCount}`);
                    }
                }
            } catch (propError) {
                console.log(`⚠️ Could not get stats for ${propKey}:`, propError.message);
            }
        }
        
        console.log(`Successfully processed ${Object.keys(allProperties).length} numeric properties`);
        
        const response = {
            statistics: {},
            discoveredProperties: allProperties,
            totalPropertiesFound: Object.keys(allProperties).length
        };
        
        const knownMappings = {
            'betweenness': 'betweenness',
            'degree': 'degree', 
            'normalizedBetweenness': 'normalizedBetweenness',
            'normalizedDegree': 'normalizedDegree',
            'cvss_score': 'cvssScore',
            'criticality': 'criticality',
            'threatScore': 'threatScore',
            'Risk Score': 'riskScore'
        };
        
        Object.entries(knownMappings).forEach(([neo4jProp, apiKey]) => {
            if (allProperties[neo4jProp]) {
                response.statistics[apiKey] = allProperties[neo4jProp];
            }
        });
        
        console.log('Sending response with:', response.totalPropertiesFound, 'properties');
        res.json(response);

    } catch (error) {
        console.error('Error fetching node attributes:', error);
        res.status(500).json({ 
            error: 'Failed to fetch node attributes', 
            details: error.message,
            stack: error.stack 
        });
    } finally {
        await session.close();
    }
});

// Custom risk component
app.post('/api/write-custom-risk-component', async (req, res) => {
    const session = driver.session();
    
    try {
        const { 
            componentName, 
            neo4jProperty, 
            formula, 
            method, 
            components, 
            targetType = 'all',
            targetValues = [],
            calculationMode = 'calculate'
        } = req.body;

        console.log(`Updating Neo4j property: ${neo4jProperty}`);
        console.log(`Method: ${method}`);
        console.log(`Target Type: ${targetType}`);
        console.log(`Calculation Mode: ${calculationMode}`);
        console.log('Components received:', components);

        let query = '';
        let whereClause = '';

        const formatPropertyName = (propName) => {
            if (propName.includes(' ') || propName.includes('-')) {
                return `\`${propName}\``;
            }
            return propName;
        };

        if (targetType === 'network' && targetValues.length > 0) {
            const networkPrefixes = targetValues.map(network => `"${network.prefix}."`);
            whereClause = `AND (${networkPrefixes.map(prefix => `ip.address STARTS WITH ${prefix}`).join(' OR ')})`;
        } else if (targetType === 'subnet' && targetValues.length > 0) {
            const subnetRanges = targetValues.map(subnet => `"${subnet.subnet}"`);
            whereClause = `AND subnet.range IN [${subnetRanges.join(', ')}]`;
        } else if (targetType === 'sample' && targetValues.length > 0) {
            const subnetRanges = targetValues.map(subnet => `"${subnet.subnet}"`);
            whereClause = `AND subnet.range IN [${subnetRanges.join(', ')}]`;
        } else if (targetType === 'ip' && targetValues.length > 0) {
            const ipAddresses = targetValues.map(ip => `"${ip.ip}"`);
            whereClause = `AND ip.address IN [${ipAddresses.join(', ')}]`;
        }

        if (calculationMode === 'setValue') {
            const setValue = components[0]?.currentValue || 0;
            
            if (targetType === 'all') {
                query = `
                MATCH (n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL
                SET n.${formatPropertyName(neo4jProperty)} = ${setValue}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            } else {
                query = `
                MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL ${whereClause}
                SET n.${formatPropertyName(neo4jProperty)} = ${setValue}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            }

        } else if (method === 'weighted_avg') {
            const weightedTerms = components.map(comp => {
                const value = comp.currentValue || 0;
                return `${value} * ${comp.weight}`;
            }).join(' + ');
            
            const totalWeights = components.reduce((sum, comp) => sum + comp.weight, 0);
            
            if (targetType === 'all') {
                query = `
                MATCH (n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL
                SET n.${formatPropertyName(neo4jProperty)} = (${weightedTerms}) / ${totalWeights}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            } else {
                query = `
                MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL ${whereClause}
                SET n.${formatPropertyName(neo4jProperty)} = (${weightedTerms}) / ${totalWeights}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            }

        } else if (method === 'max') {
            const maxTerms = components.map(comp => comp.currentValue || 0).join(', ');
            
            if (targetType === 'all') {
                query = `
                MATCH (n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL
                SET n.${formatPropertyName(neo4jProperty)} = apoc.coll.max([${maxTerms}])
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            } else {
                query = `
                MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL ${whereClause}
                SET n.${formatPropertyName(neo4jProperty)} = apoc.coll.max([${maxTerms}])
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            }

        } else if (method === 'sum') {
            const sumTerms = components.map(comp => comp.currentValue || 0).join(' + ');
            
            if (targetType === 'all') {
                query = `
                MATCH (n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL
                SET n.${formatPropertyName(neo4jProperty)} = ${sumTerms}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            } else {
                query = `
                MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL ${whereClause}
                SET n.${formatPropertyName(neo4jProperty)} = ${sumTerms}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            }

        } else if (method === 'geometric_mean') {
            const safeComponents = components.map(comp => {
                const value = comp.currentValue || 0;
                return `CASE WHEN ${value} <= 0 THEN 0.1 ELSE ${value} END`;
            });
            const geometricFormula = `(${safeComponents.join(' * ')}) ^ (1.0/${components.length})`;
            
            if (targetType === 'all') {
                query = `
                MATCH (n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL
                SET n.${formatPropertyName(neo4jProperty)} = ${geometricFormula}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            } else {
                query = `
                MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL ${whereClause}
                SET n.${formatPropertyName(neo4jProperty)} = ${geometricFormula}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            }
        } else if (method === 'custom_formula') {
            let formulaExpression = formula;
            
            components.forEach(comp => {
                const value = comp.currentValue || 0;
                const regex = new RegExp(comp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                formulaExpression = formulaExpression.replace(regex, value.toString());
            });
            
            if (targetType === 'all') {
                query = `
                MATCH (n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL
                SET n.${formatPropertyName(neo4jProperty)} = ${formulaExpression}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            } else {
                query = `
                MATCH (subnet:Subnet)<-[:PART_OF]-(ip:IP)<-[:HAS_ASSIGNED]-(n:Node)
                WHERE n.\`Risk Score\` IS NOT NULL ${whereClause}
                SET n.${formatPropertyName(neo4jProperty)} = ${formulaExpression}
                RETURN count(n) as updatedNodes, avg(n.${formatPropertyName(neo4jProperty)}) as avgValue
                `;
            }

        } else {
            throw new Error(`Unsupported method: ${method}`);
        }

        console.log('Executing Node query:', query);
        const result = await session.run(query);
        const record = result.records[0];
        const updatedNodes = record.get('updatedNodes').toNumber();
        const avgValue = record.get('avgValue');

        console.log(`Successfully updated ${updatedNodes} Node objects`);

        res.json({
            success: true,
            message: `Property '${neo4jProperty}' updated on Node objects`,
            results: {
                updatedNodes,
                avgValue: parseFloat(avgValue?.toFixed(2) || '0'),
                neo4jProperty,
                method,
                componentCount: components.length,
                targetType,
                targetCount: targetValues.length,
                calculationMode
            }
        });

    } catch (error) {
        console.error('Error updating Node property:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update Node property',
            details: error.message 
        });
    } finally {
        await session.close();
    }
});

// Cache management endpoints
app.post('/api/refresh-cache', async (req, res) => {
    try {
        console.log('Manual cache refresh requested...');
        
        if (fs.existsSync(virtualNetworkFilePath)) {
            fs.unlinkSync(virtualNetworkFilePath);
        }
        
        virtualNetwork = new graphlib.Graph();
        const initialData = await getInitialData();
        await populateVirtualNetwork(initialData);
        saveVirtualNetwork();
        
        res.json({ 
            message: 'Cache refreshed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error refreshing cache:', error);
        res.status(500).json({ error: 'Failed to refresh cache' });
    }
});

app.get('/api/cache-status', (req, res) => {
    try {
        if (fs.existsSync(virtualNetworkFilePath)) {
            const stats = fs.statSync(virtualNetworkFilePath);
            const ageHours = (Date.now() - stats.mtime) / (1000 * 60 * 60);
            
            res.json({
                exists: true,
                created: stats.mtime,
                createdFormatted: new Date(stats.mtime).toISOString(),
                ageHours: parseFloat(ageHours.toFixed(2)),
                isStale: ageHours > CACHE_MAX_AGE_HOURS,
                maxAgeHours: CACHE_MAX_AGE_HOURS,
                nodeCount: virtualNetwork.nodeCount(),
                edgeCount: virtualNetwork.edgeCount()
            });
        } else {
            res.json({
                exists: false,
                nodeCount: virtualNetwork.nodeCount(),
                edgeCount: virtualNetwork.edgeCount()
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to check cache status' });
    }
});

// Start server
app.listen(port, async () => {
    console.log(`Merged server listening at http://localhost:${port}`);
    await loadVirtualNetwork();
});

// Shutdown handlers
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    console.log('Preserving network cache for next startup.');
    
    virtualNetwork = new graphlib.Graph();
    
    driver.close();
    process.exit();
});

process.on('exit', () => {
    console.log('Exited');
    driver.close();
});

app.get('/api/risk/formulas/predefined', async (req, res) => {
  try {
    console.log('Fetching predefined formulas from ISIM...');
    const response = await fetch(`${ISIM_API_BASE}/formulas/predefined`);
    const data = await response.json();
    console.log('Received predefined formulas:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching predefined formulas:', error);
    res.status(500).json({ error: 'Failed to fetch predefined formulas' });
  }
});

app.get('/api/risk/formulas/custom', async (req, res) => {
  try {
    const response = await fetch(`${ISIM_API_BASE}/formulas/custom`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching custom formulas:', error);
    res.status(500).json({ error: 'Failed to fetch custom formulas' });
  }
});

app.get('/api/risk/formulas/active', async (req, res) => {
  try {
    const response = await fetch(`${ISIM_API_BASE}/formulas/active`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching active formula:', error);
    res.status(500).json({ error: 'Failed to fetch active formula' });
  }
});

app.get('/api/risk/components/available', async (req, res) => {
  try {
    const response = await fetch(`${ISIM_API_BASE}/components/available`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching available components:', error);
    res.status(500).json({ error: 'Failed to fetch available components' });
  }
});

app.post('/api/risk/formulas/custom', async (req, res) => {
  try {
    const response = await fetch(`${ISIM_API_BASE}/formulas/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error creating custom formula:', error);
    res.status(500).json({ error: 'Failed to create custom formula' });
  }
});

app.put('/api/risk/formulas/active', async (req, res) => {
  try {
    const response = await fetch(`${ISIM_API_BASE}/formulas/active`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error setting active formula:', error);
    res.status(500).json({ error: 'Failed to set active formula' });
  }
});

app.delete('/api/risk/formulas/custom/:formulaId', async (req, res) => {
  try {
    console.log('Deleting custom formula:', req.params.formulaId);
    const response = await fetch(`${ISIM_API_BASE}/formulas/custom/${req.params.formulaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
    
    const data = await response.json();
    console.log('Formula deleted successfully:', data);
    res.json(data);
  } catch (error) {
    console.error('Error deleting custom formula:', error);
    res.status(500).json({ error: 'Failed to delete custom formula' });
  }
});

app.delete('/api/risk/components/custom/:componentId', async (req, res) => {
  try {
    console.log('=== COMPONENT DELETION DEBUG ===');
    console.log('Deleting custom component:', req.params.componentId);
    
    // Step 1: Get component details before deletion
    console.log('Step 1: Getting component details...');
    const getResponse = await fetch(`${ISIM_API_BASE}/components/available`);
    
    if (!getResponse.ok) {
      console.log('Failed to get components list:', getResponse.status);
      return res.status(500).json({ error: 'Failed to get component details' });
    }
    
    const componentsData = await getResponse.json();
    let componentToDelete = null;
    
    console.log('Total available components:', componentsData.available_components?.length || 0);
    
    if (componentsData.available_components) {
      componentToDelete = componentsData.available_components.find(
        comp => comp.id.toString() === req.params.componentId
      );
      console.log('Found component to delete:', {
        name: componentToDelete?.name,
        neo4jProperty: componentToDelete?.neo4jProperty,
        type: componentToDelete?.type
      });
    }
    
    // Step 2: Delete from config file
    console.log('Step 2: Deleting from config...');
    const configDeleteResponse = await fetch(`${ISIM_API_BASE}/components/custom/${req.params.componentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!configDeleteResponse.ok) {
      console.log('Config deletion failed:', configDeleteResponse.status);
      const errorData = await configDeleteResponse.json();
      return res.status(configDeleteResponse.status).json(errorData);
    }
    
    const configData = await configDeleteResponse.json();
    console.log('Config deletion successful');
    
    // Step 3: Delete property from Neo4j if we found the component
    if (componentToDelete && componentToDelete.neo4jProperty) {
      try {
        console.log(`Step 3: Testing Neo4j property first: ${componentToDelete.neo4jProperty}`);
        
        // First test if the property exists
        const testUrl = `${ISIM_API_BASE}/components/neo4j-property-test/${encodeURIComponent(componentToDelete.neo4jProperty)}`;
        console.log('Testing URL:', testUrl);
        
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('Neo4j test result:', testData);
          
          if (testData.nodeCount > 0) {
            // Property exists, now delete it
            console.log(`Step 4: Deleting Neo4j property: ${componentToDelete.neo4jProperty}`);
            const deleteUrl = `${ISIM_API_BASE}/components/neo4j-property/${encodeURIComponent(componentToDelete.neo4jProperty)}`;
            console.log('Delete URL:', deleteUrl);
            
            const neo4jDeleteResponse = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            console.log('Neo4j delete response status:', neo4jDeleteResponse.status);
            
            if (neo4jDeleteResponse.ok) {
              const neo4jData = await neo4jDeleteResponse.json();
              console.log('Neo4j deletion successful:', neo4jData);
              
              res.json({
                ...configData,
                neo4jDeletion: neo4jData,
                message: `Component deleted from config and ${neo4jData.nodesUpdated} nodes updated in Neo4j`
              });
            } else {
              const neo4jError = await neo4jDeleteResponse.text();
              console.error('Neo4j deletion failed:', neo4jError);
              res.json({
                ...configData,
                warning: 'Component deleted from config but Neo4j cleanup failed',
                neo4jError: neo4jError
              });
            }
          } else {
            console.log('Property not found in Neo4j, no deletion needed');
            res.json({
              ...configData,
              message: 'Component deleted from config (property not found in Neo4j)'
            });
          }
        } else {
          const testError = await testResponse.text();
          console.error('Neo4j test failed:', testError);
          res.json({
            ...configData,
            warning: 'Component deleted from config but could not test Neo4j property',
            testError: testError
          });
        }
      } catch (neo4jError) {
        console.error('Neo4j operation error:', neo4jError);
        res.json({
          ...configData,
          warning: 'Component deleted from config but Neo4j cleanup failed',
          neo4jError: neo4jError.message
        });
      }
    } else {
      console.log('No Neo4j property to delete');
      res.json({
        ...configData,
        message: 'Component deleted from config (no Neo4j property specified)'
      });
    }
    
    console.log('=== COMPONENT DELETION COMPLETE ===');
    
  } catch (error) {
    console.error('Error deleting custom component:', error);
    res.status(500).json({ 
      error: 'Failed to delete custom component', 
      details: error.message 
    });
  }
});