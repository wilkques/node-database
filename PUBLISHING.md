# Publishing Checklist and Guide

This document provides a complete guide for publishing the @wilkques/database package to npm.

## Pre-Publishing Checklist

### ✅ Development Complete
- [ ] All features implemented and tested
- [ ] Code review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated with version changes

### ✅ Quality Assurance
- [ ] All tests passing (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code formatting applied (`npm run format`)
- [ ] Build succeeds (`npm run build`)

### ✅ Package Configuration
- [ ] package.json version updated
- [ ] package.json metadata correct (name, description, keywords, etc.)
- [ ] Dependencies properly categorized (dev/peer dependencies)
- [ ] Files array includes only necessary files
- [ ] Main/module/types exports correctly configured

### ✅ Documentation
- [ ] README.md comprehensive and up-to-date
- [ ] API documentation complete
- [ ] Examples working and tested
- [ ] CHANGELOG.md updated
- [ ] LICENSE file present

### ✅ npm Preparation
- [ ] npm account logged in (`npm whoami`)
- [ ] Package name available on npm registry
- [ ] Publishing scope permissions verified

## Publishing Commands

### 1. Final Verification
```bash
# Ensure working directory is clean
git status

# Run full test suite
npm test

# Run type checking
npm run type-check

# Verify build output
npm run build

# Test local package installation
npm pack --dry-run
```

### 2. Version Management
```bash
# For patch version (1.0.0 → 1.0.1)
npm version patch

# For minor version (1.0.0 → 1.1.0)
npm version minor

# For major version (1.0.0 → 2.0.0)
npm version major

# Or specify exact version
npm version 1.0.0
```

### 3. Publishing Options

#### Standard Publishing
```bash
# Publish to npm (requires login)
npm publish

# Publish with specific tag
npm publish --tag beta
npm publish --tag latest
```

#### Dry Run (Recommended First)
```bash
# Simulate publishing without actually doing it
npm publish --dry-run
```

#### Scoped Package Publishing
```bash
# For scoped packages (already configured)
npm publish --access public
```

## Post-Publishing Checklist

### ✅ Verification
- [ ] Package appears on npm registry
- [ ] Package can be installed via npm
- [ ] Package imports work correctly
- [ ] TypeScript definitions load properly

### ✅ Documentation Updates
- [ ] GitHub release created with CHANGELOG
- [ ] README badges updated with version
- [ ] Documentation site updated (if applicable)

### ✅ Communication
- [ ] Team notified of new release
- [ ] Update any dependent projects
- [ ] Social media/blog posts (if applicable)

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   npm login
   npm whoami  # Verify login
   ```

2. **Package Name Already Taken**
   - Choose a different name in package.json
   - Use scoped package (@username/package-name)

3. **Version Already Exists**
   ```bash
   npm version patch  # Increment version
   ```

4. **Build Failures**
   ```bash
   npm run clean
   npm run build
   ```

5. **Test Failures**
   - Fix failing tests before publishing
   - Ensure all dependencies are installed

### Emergency Unpublish (Within 72 Hours)
```bash
# Only for new packages within 72 hours
npm unpublish @wilkques/database@1.0.0

# For older packages, use deprecation
npm deprecate @wilkques/database@1.0.0 "This version has critical bugs"
```

## Current Package Status

**Package Name**: @wilkques/database  
**Current Version**: 1.0.0  
**Registry Status**: Available (package name not taken)  
**Dependencies**: None (peer dependencies only)  
**Test Status**: ✅ All 228 tests passing  
**Build Status**: ✅ TypeScript compilation successful  
**Documentation**: ✅ Complete  

## Environment Setup Required

### 1. npm Login
```bash
npm login
# Follow prompts to enter credentials
```

### 2. Verify Permissions
```bash
npm whoami
# Should return your npm username
```

### 3. Two-Factor Authentication
If your account has 2FA enabled:
```bash
npm publish --otp=123456
# Replace 123456 with your 2FA code
```

## Recommended Publishing Workflow

1. **Development Complete** → Run full checklist
2. **Pre-publish Testing** → `npm pack --dry-run` and test installation
3. **Version Bump** → `npm version patch/minor/major`
4. **Dry Run Publish** → `npm publish --dry-run`
5. **Actual Publish** → `npm publish --access public`
6. **Post-publish Verification** → Test installation and functionality
7. **Documentation Updates** → Update GitHub, etc.

## Support

If you encounter issues during publishing:
1. Check npm status: https://status.npmjs.org/
2. Review npm documentation: https://docs.npmjs.com/
3. Contact npm support if needed