---
'@lion/ui': patch
---

Generate the Custom Elements Manifest from runtime entrypoints only. Test helper and test suite entrypoints previously pulled fixture registrations and testing dependencies into the published manifest, including invalid custom element names such as `tagString` and `wrapperTagName`.
