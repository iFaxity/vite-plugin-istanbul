/**
 * @type {import('semantic-release').GlobalConfig}
 */
const config = {
  branches: ['main', { channel: 'next', name: 'next', prerelease: 'rc' }],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          { release: 'patch', type: 'refactor' },
          { release: 'patch', type: 'style' },
          { release: 'major', type: 'break' },
        ],
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
  ],
};

export default config;
