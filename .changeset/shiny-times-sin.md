---
'@lion/ui': patch
---

Fix npm installation failures by shipping the unpacked, bundled phone-number library
instead of a dependency on a package-relative tarball. Preserve the updated
libphonenumber v9.0.41 metadata, including French Guiana premium-rate numbers.
