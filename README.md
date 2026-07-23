# lta-btds-gui

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.10.

## Working with this lta-btds-gui
### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Generating coverage report

Run `pnpm run test:coverage` to execute tests once and generate coverage reports.

Coverage output is available at `coverage/lta-btds-gui/`:
- `index.html` for detailed HTML coverage view
- `lcov.info` for CI tools and quality gates

### Running code quality test

Run `ng lint` to execute code quality test using eslint.

### Running code quality test

Run `ng lint --fix` to execute code fix for code quality issues.

### Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

### Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Branching Strategy

Implementing a branching strategy in GitLab for different environments like Development (DEV), System Integration Testing (SIT), and User Acceptance Testing (UAT) can help streamline the software development process and ensure smooth deployment

**Developers should follow this branching workflows.**
1. feature branch to dev branch
2. dev branch to sit branch
3. sit branch to uat branch

### Feature Branches
Developers create feature branches from the development branch for implementing new features or fixing bugs.
Each feature branch should have a descriptive name that reflects the feature or issue being addressed.
Once development is complete, developers create merge requests (MRs) to merge their feature branches back into the development branch.

**Developers can merge their own MRs from feature branch to dev branch!**

### Development Branch (dev)

The development branch serves as the primary integration branch for ongoing development work.
Developers create feature branches from the development branch to work on new features or bug fixes.

**dev branch is default branch for this repository**

### System Integration Testing (SIT) Branch

After features are merged into the development branch and deemed ready for testing, a new branch can be created for system integration testing (SIT).
This branch serves as a stable environment for integrating and testing features before they are promoted to UAT.
Changes from the development branch are periodically merged into the SIT branch to ensure it stays up to date with the latest changes.

**Developers can create MR from dev branch to sit branch. However, merge request is blocked and requres one approval by the admin to merge and approve the MR.** 

### User Acceptance Testing (UAT) Branch

Once features have been tested and approved in the SIT environment, they can be promoted to the user acceptance testing (UAT) branch.
The UAT branch serves as a staging environment where stakeholders can perform final testing and validation of the features before they are deployed to production.
Changes from the SIT branch are periodically merged into the UAT branch to ensure alignment between environments.

**Developers can create MR from sit branch to uat branch. However, merge request is blocked and requres one approval by the admin to merge and approve the MR.** 

## CI/CD

GitLab CI/CD (Continuous Integration/Continuous Deployment) is a powerful automation tool that allows developers to automate the build, test, and deployment processes of their software projects directly within the GitLab platform. Here's an overview of GitLab CI/CD and how it works:


### Overview

1. Integration with Version Control: GitLab CI/CD is tightly integrated with GitLab's version control system, allowing developers to define CI/CD pipelines directly within their GitLab repositories. This enables seamless collaboration and version control for CI/CD configuration files.
  
2. Pipeline Configuration: CI/CD pipelines in GitLab are defined using YAML configuration files (.gitlab-ci.yml) that reside in the root directory of the repository. These configuration files specify the stages, jobs, and scripts that make up the CI/CD pipeline.

3. Stages and Jobs: A CI/CD pipeline consists of multiple stages, each of which contains one or more jobs. Stages represent the different phases of the pipeline (e.g., build, test, deploy), while jobs define the individual tasks to be executed within each stage.

4. Runners: GitLab Runners are lightweight agents that execute the jobs defined in CI/CD pipelines. Runners can be configured to run jobs on specific platforms (e.g., Linux, Windows, macOS) and can be self-hosted or provided by GitLab.

5. Triggering Pipelines: CI/CD pipelines in GitLab can be triggered automatically on various events, such as code pushes, merge requests, or scheduled intervals. Additionally, developers can manually trigger pipelines from the GitLab UI or using GitLab's API.

6. Parallel Execution: GitLab CI/CD supports parallel execution of jobs within a pipeline, allowing multiple jobs to run concurrently to optimize build times and improve overall pipeline efficiency.
Artifacts and Caching: CI/CD pipelines can produce artifacts, such as compiled binaries or test reports, which can be stored and accessed for later use. GitLab also supports caching dependencies between pipeline runs to speed up subsequent builds.

7. Environment and Variables: GitLab CI/CD provides support for defining environments (e.g., production, staging) and managing environment-specific variables. This allows developers to deploy their applications to different environments with confidence.


### Workflow:

1. Commit Changes: Developers commit changes to their GitLab repositories as usual.
CI/CD Pipeline Execution: GitLab automatically detects the changes and triggers the corresponding CI/CD pipeline defined in the .gitlab-ci.yml file.

2. Job Execution: The GitLab Runner executes the jobs defined in the pipeline, following the specified stages and sequence of tasks.

3. Feedback and Notifications: Developers receive feedback on the pipeline execution status, including build/test results, deployment outcomes, and any errors or warnings encountered.

4. Iterative Development: Developers iterate on their code, making further changes and improvements, and continue to leverage GitLab CI/CD for automated testing, validation, and deployment.

```
└── 📁src
    └── 📁app
        └── 📁components
            └── 📁dialog
                └── confirmation-dialog.html
                └── confirmation-dialog.scss
                └── confirmation-dialog.spec.ts
                └── confirmation-dialog.ts
            └── 📁layout
                └── layout.component.html
                └── layout.component.scss
                └── layout.component.ts
        └── 📁guards
            └── auth.guard.ts
        └── 📁models
            └── bus-list.ts
        └── 📁services
            └── auth.service.ts
        └── 📁store
            └── 📁snackbar
                └── snackbar.action.ts
                └── snackbar.reducer.ts
            └── app.state.ts
        └── 📁views
            └── 📁bus
                └── 📁daily-bus-list
                    └── 📁search
                        └── bus-search.component.html
                        └── bus-search.component.scss
                        └── bus-search.component.spec.ts
                        └── bus-search.component.ts
                    └── 📁view
                        └── view.component.html
                        └── view.component.scss
                        └── view.component.spec.ts
                        └── view.component.ts
            └── 📁monitoring
                └── 📁bus-operation
                    └── bus-operation.component.html
                    └── bus-operation.component.scss
                    └── bus-operation.component.spec.ts
                    └── bus-operation.component.ts
        └── app.component.html
        └── app.component.scss
        └── app.component.ts
        └── app.routes.ts
    └── 📁assets
        └── 📁fonts
            └── 📁Inter
                └── Inter-Black.ttf
        └── 📁icons
            └── check.svg
        └── app-config.json
    └── 📁styles
        └── _breakpoints.scss
        └── styles.scss
    └── index.html
    └── main.ts
```

