module.exports = {
  branches: [
    "main",
    { name: "staging", prerelease: "rc" }
  ],
  tagFormat: "v${version}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github"
  ]
};
