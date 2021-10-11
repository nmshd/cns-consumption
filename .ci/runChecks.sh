set -e
set -x

npm ci
npm run lint:prettier
npm run lint:eslint
npx license-check

# dev dependencies should only be checked with audit level 'high'
# because there is currently an issue with one of the dependencies
npm audit --production && npm audit --audit-level high
