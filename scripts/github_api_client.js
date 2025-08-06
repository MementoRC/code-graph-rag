/**
 * GitHub API Client for Branch Management
 * ---------------------------------------
 * Provides functions to create and check branches using GitHub API v4 (GraphQL) and v3 (REST).
 */

const { Octokit } = require("@octokit/rest");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required.");
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

/**
 * Check if a branch exists in the repository.
 * @param {string} repo - "owner/repo"
 * @param {string} branch - branch name
 * @returns {Promise<boolean>}
 */
async function branchExists(repo, branch) {
    const [owner, repoName] = repo.split('/');
    try {
        await octokit.repos.getBranch({
            owner,
            repo: repoName,
            branch
        });
        return true;
    } catch (e) {
        if (e.status === 404) return false;
        throw e;
    }
}

/**
 * Create a new branch from a base branch.
 * @param {string} repo - "owner/repo"
 * @param {string} newBranch - new branch name
 * @param {string} baseBranch - base branch name
 */
async function createBranch(repo, newBranch, baseBranch) {
    const [owner, repoName] = repo.split('/');
    // Get base branch SHA
    const { data: baseData } = await octokit.repos.getBranch({
        owner,
        repo: repoName,
        branch: baseBranch
    });
    const baseSha = baseData.commit.sha;

    // Create new branch ref
    await octokit.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${newBranch}`,
        sha: baseSha
    });
}

module.exports = {
    branchExists,
    createBranch
};
