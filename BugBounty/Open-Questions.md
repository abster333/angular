# Open Questions & Uncertainties

The following items could not be definitively confirmed from primary sources or require further clarification.

## 1. Status of `security@angular.io`
- **Question:** Is `security@angular.io` still an active and monitored channel for initial vulnerability disclosure?
- **Context:** While the user mentioned this email, the official `SECURITY.md` and `angular.dev` documentation exclusively point to the Google Bug Hunters portal.
- **Action:** Clarify if this email is for non-VRP coordination or if it has been deprecated in favor of the centralized Google portal.

## 2. Scope of "Core Repositories"
- **Question:** Which specific repositories under the `angular` organization are considered "Flagship OSS" vs "Standard OSS"?
- **Context:** The Google OSS VRP rules state that for organizations, only "core repositories" are Flagship.
- **Action:** Verify if repositories like `angular/angular-cli` or `angular/components` are officially in the Flagship tier or the Standard tier.

## 3. Dependency Reward Eligibility
- **Question:** What is the exact threshold for "demonstrating impact" in a 3rd-party dependency?
- **Context:** The rules require showing the vulnerability manifests in Google OSS.
- **Action:** Determine if a theoretical path is sufficient or if a fully functional PoC against an Angular build is required.
