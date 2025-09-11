Great — here’s the revised polished article with your requested updates, placeholders for team members/managers, and the stronger wording.

⸻

Enterprise Architecture Tooling: Translating, Automating, and Elevating Architecture Practices

Overview

The Enterprise Architecture team is committed to building solutions that simplify, standardize, and accelerate architecture practices across the firm. At the center of this effort is C4TS (C4 Translation Service), an internally developed platform that enables seamless translation and visualization of architectural models. Surrounding C4TS, the team has expanded into CALM (Common Architecture Language Model) integration, Policy as Code (PaC), and a new wave of GenAI-powered automation under the Ai-rchitect platform. Together, these initiatives reduce manual work, enhance compliance, and empower architects and developers to focus on designing resilient, future-ready systems.

⸻

C4TS – The Core Platform

C4TS is the flagship of the portfolio. It addresses one of the hardest challenges in enterprise architecture: ensuring that models remain usable and accurate across diverse tools and frameworks.
	•	iDesigner Integration: Enables bidirectional translation between iDesigner proprietary JSON and C4 JSON/DSL. This reduces duplication and accelerates security reviews, case creation, and artifact management.
	•	Format Translation Service: Automates translation across formats such as C4 DSL, Mermaid, PlantUML, Breeze, PNG, and SVG, improving interoperability across platforms.
	•	Image Translation Service: Produces rich, up-to-date architecture diagrams (PNG, SVG) that plug directly into pipelines and application code, keeping visuals synchronized with source models.
	•	Developer Libraries: To make adoption easier, the team built Java and Python client libraries, enabling engineers to integrate C4TS directly into their codebases and development workflows.
	•	Analytics Platform: Beyond translation, the team developed an analytics layer that monitors usage of both C4TS and Structurizr services. This provides insights into adoption, highlights growth trends, and guides ongoing product improvements.

By automating translation, reducing complexity, and embedding usage insights, C4TS accelerates documentation cycles while ensuring fidelity across multiple representations.

⸻

CALM (Common Architecture Language Model)

As part of the FINOS open-source initiative, CALM provides a structured JSON schema for describing architectures. ETS plays a key role in enabling CALM adoption across the firm.

Through C4TS integration, architects can transform C4 models into CALM-compliant structures, embedding policy-driven rules and patterns into architecture. This ensures designs are consistent, compliant, and reusable across teams.

Why CALM matters:
	•	Standardized architecture descriptions in a machine-readable format.
	•	Automated validation and compliance checks in pipelines.
	•	Reduction in manual modeling effort through governance automation.

⸻

Policy as Code (PaC)

Policy as Code extends automation into governance and compliance. Instead of relying on static documentation, PaC translates policies, controls, and evidence into structured, testable definitions.

Business benefits include:
	•	Greater consistency and accuracy of controls.
	•	Automated compliance and drift detection between approval vs. implementation.
	•	Faster validation cycles and improved auditability.

When combined with CALM, PaC enables metadata mapping from firm documents into CALM schemas, visualizing the chain of policies → controls → evidence within architecture models.

⸻

Ai-rchitect: GenAI-Powered Enhancements

Beyond translation and compliance, the Enterprise Architecture team is advancing automation with Ai-rchitect, a GenAI platform designed to enhance architecture practices. Two major initiatives now live under this umbrella are:

Structurizr DSL Generator

Analyzes repositories and generates architecture documentation automatically in C4 DSL format.
	•	Produces starter artifacts effortlessly, even for legacy systems.
	•	Ensures a structured, industry-standard format for consistency.
	•	Integrates with Structurizr and visualization tools.
	•	Accelerates onboarding with clear documentation.
	•	Supports governance by maintaining an up-to-date system view.
	•	Identifies technical debt through visualized code structures.

C4 Reviewer

Guides teams in improving the quality and usability of C4 DSL documentation by leveraging GenAI for best practice analysis.
	•	Elevates C4 Models Beyond Visualization by treating DSL as full architectural documentation.
	•	Improves Quality by applying coding best practices and assurance techniques.
	•	Enables Reusable and Extensible Diagrams through best-practice recommendations.
	•	Unlocks Underused Features in Structurizr C4 DSL often overlooked by users.

Who it serves:
	•	New adopters learning the C4 DSL.
	•	Experienced users aiming to improve documentation quality.
	•	Architecture teams standardizing practices.
	•	Reviewers validating architectural outputs.

How it works:
	•	Curates and refines a C4 best practices library.
	•	Applies AI-powered analysis against these best practices.
	•	Provides multi-dimensional feedback (Core, Advanced, Nice-to-Have).
	•	Supports interactive discussions for clarification.
	•	Enables continuous improvement through user feedback.

Together, the DSL Generator and C4 Reviewer establish Ai-rchitect as a platform that not only automates documentation but also enhances quality and governance through intelligent recommendations.

⸻

Challenges and Contributions

The Enterprise Architecture team has consistently delivered solutions that make architecture more efficient, transparent, and compliant. From developer libraries and analytics platforms to policy-driven compliance and AI-enhanced documentation, the team has transformed how architecture is created and maintained across the firm.

This innovative work is the result of the dedication and expertise of the ETS Tooling team, whose focus on automation, interoperability, and governance ensures that enterprise architecture evolves with the demands of the business.

⸻

Team Members

This work is made possible by the Enterprise Architecture (ETS Tooling) team.
Team Members: [Insert names here]
Managers: [Insert managers here]

⸻

Would you like me to suggest a crisp one-liner tagline to sit right at the top (something like “From translation to AI-powered automation, ETS is redefining enterprise architecture tooling”) — or keep it clean and formal like the Honeycomb article?

Hi Denis,

I’ve prepared a document titled “Project Spotlight: Enterprise Architecture” in Jive as part of Turntabl’s monthly Project Spotlight series. Could you please review it and let me know if I can go ahead and share it with the Turntabl marketing team for inclusion in this month’s newsletter, or if you’d like any changes made?

Thank you,



Got it ✅ — let’s take this step by step so you can just copy/paste each change into the existing article. I’ll outline the section, where the change should go, and the exact wording.

⸻

1. Title Change
	•	Current: Enterprise Architecture Tooling: Translating, Automating, and Elevating Architecture Practices
	•	Replace with:
What Do Enterprise Architecture and Turntabl Have in Common? Innovation!

⸻

2. C4TS Section – Remove Breeze & Add Link
	•	Where: Under Format Translation Service
	•	Edit to:
“Automates translation across formats such as C4 DSL, Mermaid, PlantUML, JSON, PNG, and SVG, improving interoperability across platforms.”
	•	Then add at the end of the C4TS section:
“For more details, see the C4TS Swagger documentation.”

⸻

3. CALM Section – Update Status & Add Links
	•	Where: In CALM section intro, after describing adoption.
	•	Insert this sentence:
“Currently, the team supports development, testing, and validation with clients and CALM contributors, with production release pending.”
	•	Conclude CALM section with:
“Learn more in the FINOS CALM documentation and the Architecture as Code repository.”

⸻

4. PaC Section – Update Wording
	•	Where: First line of PaC section.
	•	Replace with:
“We are currently in the mapping stage of TCRs (previously referred to as [old name]) into CALM documents.”

⸻

5. Structurizr DSL Generator Section – Rephrase & Add Link
	•	Where: First sentence of Structurizr DSL Generator description.
	•	Change:
“Analyzes repositories and generates…” → “Analyzes source code repositories and generates…”
	•	Conclude section with:
“Try the service here: Structurizr DSL Generator.”

⸻

6. C4 Reviewer Section – Add Link
	•	At the end of C4 Reviewer section, add:
“Try the service here: C4 Reviewer.”

⸻

7. Architecture Strategy Insert
	•	New Subsection, before “Challenges and Contributions.”
	•	Add:
Architecture Strategy
“As part of strategy, Yoofi introduced a short but impactful exercise to help visualize business capabilities and align strategy with technology programs. This continues to guide how we connect architecture outcomes to business priorities.”

⸻

8. Team Section – Rephrase Acknowledgment
	•	Replace with:
“This work is the result of the dedication and expertise of the Enterprise Architecture ETS Tooling team. The team is comprised of [list names], achieved under the incredible guidance of [Manager 1] and [Manager 2], who continue to support and steer these initiatives.”

⸻

9. Ending Statement – Forward Looking
	•	Replace last paragraph with:
“With C4TS at its core, and expanded capabilities through CALM, PaC, and Ai-rchitect, the Enterprise Architecture ETS Tooling team is shaping the future of architecture at Turntabl. By blending automation, compliance, and intelligence, we are redefining how innovation happens across the firm.”

⸻

👉 Would you like me to also prepare a final version with hashtags + tagging lines (as per your manager’s point #9 and #10) so it’s ready for Jive and LinkedIn?




Architecture Strategy
Angela partnered with the team to develop a POC for visualizing the firm-wide architecture strategy in a maintainable way. Traditionally, this strategy lived in PowerPoints, whiteboards, and Visio diagrams, but the team trialed documenting it using architecture-as-code tooling.

Yoofi visualized the firm-wide architecture strategy with Structurizr Image Rendering, showing the various initiatives and supporting tools. The visualization highlighted numerous connections between strategy, initiatives, and tooling, leveraging Structurizr’s graph-display structure. This exercise surfaced hard dependencies, accelerators, deviations, and informers between strategy elements — providing a clearer, more actionable view of the enterprise strategy.

⸻

3. CALM Section – OSFF Mention

Yes, absolutely worth mentioning. It connects your team’s external engagement with the open-source community, showing visibility and leadership. You could add this sentence at the end of the CALM section (just before the links):

“In June 2025, two members of the team attended the Open Source in Finance Forum (OSFF) in London, engaging directly with CALM contributors and industry peers to share insights and strengthen collaboration.”




Summary
The Enterprise Architecture ETS Tooling team is leading efforts to simplify, standardize, and innovate architecture practices across the firm.

The Enterprise Architecture ETS Tooling team has been busy pushing the boundaries of how we manage and share architecture across the firm.

Our main product, C4TS (C4 Translation Service), makes it easier to translate models, generate images, and integrate directly into codebases through Java and Python libraries. We’ve also built analytics around usage to understand adoption and guide improvements.

On top of this, we’re working with CALM to bring more consistency and compliance into architecture, and with Policy as Code to automate governance. Through our Ai-rchitect platform, we’ve delivered two GenAI-powered tools — the Structurizr DSL Generator and the C4 Reviewer — helping teams generate documentation faster and raise the quality of their architectural practices.

This year, we also trialed new ways to visualize the firm-wide strategy using architecture-as-code, and two of our team members represented us at the Open Source in Finance Forum (OSFF) in London to share insights with the wider community.

At the core, our work is about reducing manual effort, improving transparency, and making architecture easier to use and maintain — while showing how innovation happens at Turntabl.