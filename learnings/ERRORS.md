# Errors Log

This file records historical error information. AI will avoid repeating the same mistakes.

## Error Format

- [YYYY-MM-DD] Error: [Error summary/command/file]
  Cause: [Error cause analysis]
  Fix: [Correct approach]

## Example

- 2026-04-16 Error: mvn clean install dependency version conflict
  Cause: Inconsistent spring-boot-starter-parent version
  Fix: Use version from bom/import-bom/pom.xml
