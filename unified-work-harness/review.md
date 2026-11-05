# Owner review handoff

Review the complete capability map using [capabilities.md](capabilities.md). Christopher Jones reviews the finished package before merge and records acceptance separately. A green CI run supports the tested paths only.

| Review item | Evidence to inspect | Remaining decision |
| --- | --- | --- |
| Source record | [Component origins](sources.md) and [package license](LICENSE) | Sole authorship confirmed by Christopher Jones. The owner reviews the final package before merge. |
| Human methods and participation | [Training and equipment cases](methods.md), original fixture data, issue reuse, private response route and disputed observation | Decide whether the public guidance preserves the selected methods at the intended depth. |
| Work agreements | [Intake](intake.md), [coordination](coordination.md), revision, clarification, transfer and review tests | Verify human interpretation of authority and capacity, storage of sensitive decisions, identity and reviewer independence for actual work. |
| Scope and effect controls | [Package profile](package-guide.md), legacy bundle, queue, candidate and versioned integrated contract tests | Confirm the available modes, endpoints, operating assumptions and tool versions suit the intended release. |
| Accessible illustration | Repository gallery provides the full-size board and adjacent numbered transcript. Panel 4 requires a clean checkout with the expected files; panel 5 depicts a temporary clone. | Inspect at the reader's preferred zoom or use the transcript. Human visual acceptance is pending. |
| Runtime capacity and limits | Crash, race, cancellation, candidate, drift, evidence and expiry fixtures. Live evidence is recorded against its specific revision. | Determine additional trials necessary for the intended deployment. No test authorizes an actual model call or a production action. |

For repeatable review, start at the package root, use `node --test *.test.mjs` on a POSIX host with Git and Node 22.13 or later. The synthetic suite needs loopback listeners. It uses temporary checkouts, a fake OpenCode worker and synthetic HTTP services. To inspect the package without dispatch, use `node package.mjs inventory`. Public distribution is a separate owner decision.
