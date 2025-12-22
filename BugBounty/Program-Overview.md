# Program Overview: Google OSS VRP (Angular)

Angular participates in the **Google Open Source Software Vulnerability Reward Program (OSS VRP)**, which is designed to reward researchers who help secure Google's open-source ecosystem.

## Primary Program
- **Name:** Google OSS VRP
- **Portal:** [bughunters.google.com](https://bughunters.google.com/)
- **Reporting Link:** [Submit a Report](https://bughunters.google.com/report)

## Reward Model (Flagship OSS Tier)
Angular is classified as a **Flagship OSS Project**, the highest priority tier in the program.

| Category | Reward Range (USD) |
| :--- | :--- |
| **Supply Chain Compromises** | $3,133.7 - $31,337 |
| **Product Vulnerabilities** | $500 - $7,500 |
| **Other Security Issues** | Up to $1,000 |

*Note: Final amounts are at the discretion of the Google reward panel. Bonus rewards of ~$1,000 may be granted for exceptionally high-quality reports.*

## Special Handling & Focus Areas
- **Supply Chain Integrity:** High priority is given to vulnerabilities that allow unauthorized code modification, compromise build artifacts, or leak package manager credentials.
- **Repository Settings:** Security issues in GitHub Actions, access control rules, and branch protection settings are explicitly in scope.
- **Dependency Policy:** Vulnerabilities in 3rd-party dependencies are rewarded if they manifest in Angular and are reported 30+ days after an upstream fix is available.

## Reporting Channels
1. **Primary:** [Google Bug Hunters Portal](https://bughunters.google.com/report) (Select "OSS VRP" and provide the repository URL).
2. **Alternative:** Historically, `security@angular.io` has been used for coordination, but official policy now directs all technical vulnerability reports to the Bug Hunters portal for VRP eligibility.
