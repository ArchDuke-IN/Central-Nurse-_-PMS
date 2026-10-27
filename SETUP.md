# Setup

## Requirements

- Windows, macOS or Linux
- Node.js **22.5.0 or later**
- npm (included with Node.js)
- Git, if you are cloning the repository

The verification tools use Node's built-in `node:sqlite` module. Earlier Node
versions are not supported.

## Install

```bash
git clone https://github.com/ArchDuke-IN/Central-Nurse-_-PMS.git
cd Central-Nurse-_-PMS
npm install
```

This project intentionally has no runtime or development dependencies, so
`npm install` only validates the package metadata and creates no dependency
tree.

## Verify the checkout

Run the complete quality gate before making changes:

```bash
npm run ci
```

The command runs JavaScript linting, scope auditing, report assembly,
verification, fault-injection tests, static-site generation and an offline
smoke test. A successful run leaves generated artifacts in `build/`, `dist/`,
`dist-web/`, `release/` and `loop_log/`.

## Develop locally

To serve the source frontend while editing:

```bash
npm run serve:dev
```

Open <http://127.0.0.1:8420>. For the production-shaped build:

```bash
npm start
```

The standalone offline application is written to
`dist-web/pms-standalone.html` and can also be opened directly.

Useful focused commands:

```bash
npm run lint       # Parse all JavaScript files
npm run verify     # Run the verification gate
npm run scope      # Check goals and milestone evidence
npm run web        # Build the static web application
npm run smoke      # Check that the built app is self-contained
npm run package    # Build release/PMS-<version>.zip
```

## Release checklist

1. Run `npm run ci` and confirm it exits successfully.
2. Review generated report and web artifacts.
3. Run `npm run package`.
4. Inspect the archive in `release/`.
5. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for pull requests.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production-style static hosting and
container deployment. This educational prototype is not a certified medical
device and must not be connected to real patient care.
