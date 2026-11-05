# Package sources

Christopher Jones confirms sole authorship of the harness, including the executor, scheduler and work-contract components. The [package license](LICENSE) accompanies the distribution. The following source identities document development history.

| Component | Source identity reviewed | Use |
| --- | --- | --- |
| Agent executor | Earlier executor script, Git blob fdf38f2ad9e554f3a8bef6ac55f4851f9a93c350, in source commit 2928f29130b03005215753afdd93088752f1af3d | Matching lease, provider request and worker-command implementations occur in the bundle. |
| Queue and goal dispatcher predecessors | Same source revision, queue blob 62339f99e3659cf29f9beb3520f070aba7d59a34 and dispatcher blob d7b076794607282d0789f24461ce6073029c4ef0 | Historical design precedents. The package schedules explicitly selected, bounded assignments. |
| Hypervisor packet, work contract and clarification | Reference blobs bc86be131ebcc695685b2af57a9ad61667faae96, 5fa425bef1c2944f794325087c116996b58e7291 and f45a72bc4fcdb15e7e58de96dfa2c5eda893f2c3 | Compare packet validation, assignment digest construction and clarification/reassessment. |
| QVCH | Skill entrypoint blob c6759b68624b6ebc7ffdb2a4c0233b80384f7a3f | Purpose selection, bounded profiles and source/permission separation. Project overlays and private skill bodies remain in their original repositories. |

These identities identify inspected snapshots. The original import commits for every function have not been reconstructed. External tools and models are installed separately and are outside the package pin.

## Method references

The following entries identify the method used for each adaptation. The public package contains its own guidance and examples; installing the source skills is optional. A snapshot match establishes the comparison point, not a line-by-line import history.

| Reference | Package use | Git blob of reference entry point |
| --- | --- | --- |
| [engineering-work-safety](https://github.com/chrisjones77/skills/blob/9f1824c1e42e984e8ff9e6d8ae4b90fdd6e78dea/engineering-work-safety/SKILL.md) | Purpose codes, effort, protection and reassessment | `7647350a84f484fa0ad32c460b7eeb256b83a898` |
| [call-and-response-harness](https://github.com/chrisjones77/skills/blob/9f1824c1e42e984e8ff9e6d8ae4b90fdd6e78dea/call-and-response-harness/SKILL.md) | Recipient choice, escalation and accountable handoff | `a4cf24e8336bea73392b740aa527ae935e24835b` |
| [forward-deployed-ai-engineer](https://github.com/chrisjones77/skills/blob/9f1824c1e42e984e8ff9e6d8ae4b90fdd6e78dea/forward-deployed-ai-engineer/SKILL.md) | Consequence, verification and operational ownership | `a0f80cf6c2678afa340da93f0b72c09965cff474` |
| [egbc-ai-professional-practice](https://github.com/chrisjones77/skills/blob/9f1824c1e42e984e8ff9e6d8ae4b90fdd6e78dea/egbc-ai-professional-practice/SKILL.md) | Competence, scope and the need for qualified review | `1f279c4b8209343a424b68ab2d912c5fd1285e33` |
| [stickler-prime](https://github.com/chrisjones77/skills/blob/9f1824c1e42e984e8ff9e6d8ae4b90fdd6e78dea/stickler-prime/SKILL.md) | Fair process, attributed concerns and opportunities to respond | `c2fc9f9b430b7ad7a835329966850a499e65a6e9` |
| [image-card-coverage-harness](https://github.com/chrisjones77/skills/blob/9f1824c1e42e984e8ff9e6d8ae4b90fdd6e78dea/image-card-coverage-harness/SKILL.md) | Coverage and regression, generalized across artifact types | `5e0b75a9f59156bef6143fad5a761d4278e08eb1` |
| Issue triage (separately maintained reference) | Reuse, duplicates, priority and readiness | `fe2977616f5c46223d16462951616a4e8c0c4060` |
| Bounded dispatch (separately maintained reference) | Named writer, scoped work and independent inspection | `d45c0fb3359b0e1f9e8cf557e18cb5e8d4c2f8f8` |
| Advisory practice (separately maintained reference) | Decision owner, evidence, limitations and handoff | `2d58fd7c227d89f855bd530d52e3a95508162e91` |
| Obligation review (separately maintained reference) | Applicability, evidence and limits on claims | `04ebf43a67d35e055f51ee333196f04b15bdce32` |
