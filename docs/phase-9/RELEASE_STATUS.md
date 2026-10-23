# Phase 9 release status

Implementation and submission deliverables are complete. The final frontend is published to the existing HTTPS website. Four deployed files (entry page, runtime configuration, JavaScript and CSS) match local release lengths and MD5 values. Fresh hosting checks passed for HTTPS, security headers, API configuration and denied direct S3 access. See VERIFICATION.json for actual UTC check time and scope.

Product changes: collapsible seven-minute presentation guide, segment navigation, timer controls and prompts that distinguish local and cloud actions; corrected welcome/AI text; improved dialog keyboard focus filtering; responsive guide styling and print exclusions. Presentation controls never automatically book capacity or modify shipment records.

Submission: 14-page technical PDF and editable DOCX, 12-slide editable PPTX with 420 seconds of speaker notes, 40 viva questions, all-eight-module 71-topic syllabus matrix, seven-minute demo script, editable Mermaid architecture diagrams, setup/deploy/evidence guides, and a 90-second captioned architecture overview in Motion JPEG AVI format. The overview is not a live screen recording. The ZIP includes source and dated evidence, excludes secrets and temporary signed transfer URLs, and contains a SHA-256 manifest.

Validation: all 49 tests pass; production build, server type check and backend bundle build pass. An isolated clean copy without cloud-config.json installed from package-lock, passed all 49 tests and built successfully. PPTX package/layout/font/import checks passed with zero layout findings. Every delivered report, DOCX rendering, viva page and slide was visually reviewed. The package archive and checksum entries are verified by the packaging script.

Remaining external checks: live browser visual/accessibility verification remains blocked by the existing origin policy; a human should rehearse the timed flow before evaluation. CloudFront account verification and confirmed human email receipt remain unresolved. These are recorded openly in the report and slides. The 19 live business regression checks are retained Phase 8 evidence and are not claimed as a new Phase 9 run. No guaranteed mark or actual food-rescue outcome is asserted.

Open the deployed app and choose **Seven-minute presentation** in the sidebar. Use the report and slides as the primary submission artifacts; the full live walkthrough is in DEMO_SCRIPT.md.
