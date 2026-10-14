# Development Lifecycle Gate Check Checklists

## 7-Phase Workflow

```
Phase 1: Requirements    Phase 2: PRD Writing    Phase 3: Technical Design
  ↓                        ↓                        ↓
Requirement desc         PRD document             Technical plan
User stories             Feature specs            Architecture decisions
Acceptance criteria      Priority ranking         Interface design
  ↓                        ↓                        ↓
Phase 4: Implementation  Phase 5: Testing         Phase 6: Code Review
  ↓                        ↓                        ↓
Module development       Unit tests               Code standard check
Follow all rules         Integration tests        Security audit
Module contracts         E2E tests                Performance check
  ↓                        ↓                        ↓
Phase 7: Deployment
  ↓
npm install → npm run dev → verify
```

---

## Phase 1: Requirements Analysis

- [ ] Is the user requirement clear and unambiguous?
- [ ] Are all stakeholders identified?
- [ ] Are success criteria explicitly defined?

---

## Phase 2: PRD Writing (handled by product-management plugin)

- [ ] Complete feature specification included?
- [ ] Acceptance criteria defined?
- [ ] Technical feasibility assessed?

---

## Phase 3: Technical Design

- [ ] API endpoints comply with section 1.3 standards?
- [ ] DB table design compatible with existing 10 tables?
- [ ] New decision records needed? → append to ADR
- [ ] Frontend follows IIFE + BA.* architecture?
- [ ] Permission codes assigned to new endpoints?

---

## Phase 4: Implementation

- [ ] ESM + no semicolons + single quotes?
- [ ] SQL uses parameterized queries (`?` placeholders)?
- [ ] New routes registered in `app.js`?
- [ ] New module needs a Validator?
- [ ] Controller → Service layering correct?
- [ ] Permission codes correctly assigned?
- [ ] Frontend uses `data-action` delegation?
- [ ] No inline `onclick` handlers?
- [ ] sesssionStorage for auth tokens?
- [ ] No hardcoded secrets or credentials?

---

## Phase 5: Testing

- [ ] Normal flow covered?
- [ ] Boundary conditions covered (null, overflow, special chars)?
- [ ] Error paths covered (unauth, forbidden, not found)?
- [ ] `:memory:` database isolation used?
- [ ] Tests independently runnable (no state dependency)?

---

## Phase 6: Code Review

- [ ] Any hardcoded secrets or credentials?
- [ ] Any SQL injection risks (string concatenation)?
- [ ] Any XSS risks (unescaped user input rendered to HTML)?
- [ ] API endpoints have appropriate permission controls?
- [ ] Error messages don't leak internal implementation details?

---

## Phase 7: Deployment

- [ ] `npm install` succeeds?
- [ ] `npm run dev` starts without errors?
- [ ] All API endpoints return correct responses?
- [ ] Database migration executed successfully?
- [ ] Seed data is ready?
- [ ] Frontend pages render correctly?
- [ ] Login with admin/admin123 works?
