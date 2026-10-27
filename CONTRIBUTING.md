# Contributing

Thank you for helping improve Central Nurse PMS. Contributions are welcome for
documentation, verification rules, accessibility, simulation behavior and
deployment tooling.

## Before you start

1. Open an issue for a substantial change so the scope can be agreed first.
2. Keep changes focused and avoid committing generated output unless the
   change specifically updates a release artifact.
3. Do not include patient data, credentials, proprietary vendor assets or
   copyrighted material that you do not have permission to distribute.

## Development workflow

```bash
git clone https://github.com/ArchDuke-IN/Central-Nurse-_-PMS.git
cd Central-Nurse-_-PMS
npm install
npm run ci
```

Create a focused branch, make the smallest complete change, and run the
relevant checks. Changes to report content, schema or tooling should normally
be validated with the full `npm run ci` command.

## Code and content standards

- Use the existing plain JavaScript, HTML, CSS and Markdown patterns.
- Keep browser code dependency-free unless a dependency is discussed in an
  issue first.
- Preserve accessibility, keyboard operation, reduced-motion behavior and
  offline operation.
- Do not describe the prototype as clinically certified or safe for patient
  care.
- Update directly related documentation and verification evidence.
- Use clear commit messages and explain behavior changes in pull requests.

## Pull requests

Include:

- a concise summary of the change and its motivation;
- the commands used to validate it and their results;
- screenshots or a short reproduction for visible UI changes;
- notes about generated artifacts, if any.

Pull requests should be reviewable, pass the quality gate, and contain no
secrets or personal data. Maintainers may request changes before merging.

## Reporting security issues

Please do not disclose exploitable details in a public issue. Follow the
private reporting instructions in [SECURITY.md](SECURITY.md).
