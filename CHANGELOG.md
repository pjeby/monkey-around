### 3.0.0
- Support independently patching instance and prototype methods.  (In earlier releases,
  if you patched an inherited method, you could not then patch the method on the prototype
  and have it affect the inheritor.)

### 2.3.0
- Support deduplication of patches via the `dedupe()` wrapper

### 2.2.0
- Improved parametric typing

### 2.1.0
- Added ES Module support

### 2.0.0
- Patch multiple methods at once

### 1.0.0
- Initial version
