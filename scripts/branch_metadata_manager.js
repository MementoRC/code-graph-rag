/**
 * Branch Metadata Manager
 * ----------------------
 * Maintains metadata for extraction branches for traceability.
 */

const fs = require('fs');
const path = require('path');

/**
 * Write branch metadata to a JSON file in the branch directory.
 * @param {string} branchDir
 * @param {object} metadata
 */
function writeBranchMetadata(branchDir, metadata) {
    const metaFile = path.join(branchDir, 'EXTRACTION_METADATA.json');
    fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
}

module.exports = {
    writeBranchMetadata
};
