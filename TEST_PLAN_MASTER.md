# PDF SEARCHER - MASTER TEST PLAN

**Version:** 1.0
**Date:** November 24, 2025
**Status:** Draft
**Prepared By:** QA Team

---

## 1. EXECUTIVE SUMMARY

### 1.1 Purpose
This document defines the comprehensive testing strategy for **PDF Searcher**, an enterprise-grade PDF document processing and similarity search application. The test plan ensures the application is production-ready, secure, performant, and reliable before deployment.

### 1.2 Application Overview
**PDF Searcher** is a Next.js 15-based web application that enables users to:
- Upload PDF documents (up to 50 MB)
- Automatically process documents using Google Document AI OCR
- Generate vector embeddings via Google Vertex AI
- Search for similar documents using a 3-stage adaptive similarity pipeline
- Compare documents visually using Draftable integration
- Manage document metadata (law firms, fund managers, fund admins, jurisdictions)

**Key Technologies:**
- **Frontend**: Next.js 15.5.4, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL with pgvector)
- **Vector Search**: Qdrant
- **Document Processing**: Google Cloud Document AI
- **Embeddings**: Google Vertex AI (text-embedding-004)
- **Storage**: Supabase Storage
- **Comparison**: Draftable API

### 1.3 Test Objectives
1. **Verify Functionality**: Ensure all features work as specified
2. **Validate Performance**: Meet response time and throughput targets
3. **Ensure Security**: Validate authentication, authorization, and data protection
4. **Confirm Reliability**: Test error handling, retry logic, and recovery mechanisms
5. **Validate Integration**: Ensure all external services integrate correctly
6. **Assess Scalability**: Verify concurrent user and document handling

### 1.4 Success Criteria
- **P0 (Critical) Tests**: 100% pass rate
- **P1 (High) Tests**: ≥95% pass rate
- **P2 (Medium) Tests**: ≥90% pass rate
- **P3 (Low) Tests**: ≥80% pass rate
- **Zero Critical/Blocker Defects** in production
- **Performance Benchmarks** met or exceeded
- **Security Scan**: No high/critical vulnerabilities

---

## 2. TEST SCOPE

### 2.1 In-Scope

#### Features to Test:
✅ **Document Management**
- Upload (single, batch, validation)
- Processing pipeline (OCR, chunking, embeddings, indexing)
- List, search, filter, sort operations
- Rename and metadata editing
- Delete with complete cleanup
- Cancel and retry operations

✅ **Similarity Search**
- General search (3-stage pipeline)
- Selected search (multi-document comparison)
- Page range filtering
- Metadata filtering
- Score threshold adjustments
- Character-based similarity metrics

✅ **Document Comparison**
- Draftable API integration
- Signed URL generation
- Comparison creation

✅ **Authentication & Authorization**
- Google OAuth login
- Email/Password login (local dev only)
- Session management
- RLS policy enforcement
- User isolation

✅ **Background Processing**
- Cron job system
- Atomic job claiming
- Stuck job recovery (>15 min)
- Worker crash resilience
- Job timeout enforcement (30 min)

✅ **External Service Integrations**
- Google Document AI
- Google Vertex AI
- Qdrant vector database
- Supabase Storage
- Draftable API

✅ **Performance & Scalability**
- Concurrent document processing
- Rate limiting
- Database connection pooling
- Large document handling (up to 50 MB)

✅ **Monitoring & Health**
- Health check endpoints
- Stuck jobs monitoring
- Connection pool metrics

#### Technical Components to Test:
- All 17 API endpoints
- 12 database tables with RLS policies
- Frontend components (20+ React components)
- Background job queue system
- Circuit breaker patterns
- Retry logic with exponential backoff

### 2.2 Out-of-Scope

❌ **Not in Current Test Plan:**
- Admin dashboard (mentioned in comments but not implemented)
- Batch processing mode (documented but not implemented)
- Analytics views beyond stuck_jobs_monitoring
- Third-party service internals (Document AI, Vertex AI algorithms)
- Browser compatibility beyond Chrome, Firefox, Safari
- Mobile app testing (web app only)
- Load testing beyond 100 concurrent users
- Disaster recovery testing
- Multi-region deployment testing

### 2.3 Test Environment Requirements

#### Development Environment:
- **Local Supabase**: Docker container
- **Local Qdrant**: Docker container
- **Node.js**: v18+ or v20+
- **Google Cloud**: Test project with Document AI & Vertex AI enabled

#### Staging Environment:
- **Supabase Cloud**: Managed instance
- **Qdrant Cloud**: Managed cluster
- **Application Server**: Staging deployment
- **Google Cloud**: Production project

#### Production Environment:
- **Supabase Cloud**: Production instance
- **Qdrant Cloud**: Production cluster
- **Application Server**: Production deployment
- **Google Cloud**: Production project

---

## 3. TEST STRATEGY & METHODOLOGY

### 3.1 Test Levels

#### 3.1.1 Unit Testing
**Scope**: Individual functions and components
**Tools**: Jest, React Testing Library
**Coverage Target**: 80%+
**Responsibility**: Development Team

**Focus Areas:**
- Utility functions (similarity scoring, chunking)
- React components (isolated rendering)
- API route handlers
- Database functions

#### 3.1.2 Integration Testing
**Scope**: Component interactions and service integrations
**Tools**: Jest, Supertest, Playwright
**Coverage Target**: 70%+
**Responsibility**: QA Team

**Focus Areas:**
- API endpoint integration
- Database operations
- External service integrations (Document AI, Vertex AI, Qdrant)
- Frontend-backend communication

#### 3.1.3 System Testing
**Scope**: End-to-end user workflows
**Tools**: Playwright, Cypress
**Coverage Target**: All P0 & P1 workflows
**Responsibility**: QA Team

**Focus Areas:**
- Complete user journeys (upload → process → search → compare)
- Multi-user scenarios
- Error scenarios and recovery

#### 3.1.4 Performance Testing
**Scope**: Load, stress, endurance, scalability
**Tools**: k6, Artillery, Lighthouse
**Responsibility**: QA + DevOps

**Focus Areas:**
- Concurrent document processing
- Search query performance
- API response times
- Database connection pool behavior

#### 3.1.5 Security Testing
**Scope**: Authentication, authorization, vulnerabilities
**Tools**: OWASP ZAP, Burp Suite, npm audit
**Responsibility**: Security Team + QA

**Focus Areas:**
- RLS policy enforcement
- Authentication bypass attempts
- Input validation
- SQL injection, XSS, CSRF

#### 3.1.6 User Acceptance Testing (UAT)
**Scope**: Business requirements validation
**Tools**: Manual testing
**Responsibility**: Product Team + Stakeholders

**Focus Areas:**
- Feature completeness
- Usability
- Business logic correctness

### 3.2 Test Approach

#### 3.2.1 Manual Testing
- Exploratory testing for edge cases
- Usability testing
- Visual regression testing
- Ad-hoc testing

#### 3.2.2 Automated Testing
- Smoke tests (run on every deployment)
- Regression tests (run nightly)
- API tests (run on every commit)
- E2E tests (run on PR merge)

#### 3.2.3 Continuous Testing
- **CI/CD Integration**: GitHub Actions
- **Pre-commit**: Linting, type checking
- **Pre-merge**: Smoke tests, unit tests
- **Pre-deployment**: Full regression suite

### 3.3 Test Data Strategy

#### 3.3.1 Test Document Library
- **Size**: 50+ sample PDFs across all size categories
- **Types**: Scanned, native, mixed, complex layouts
- **Content**: Legal documents, financial reports, technical manuals
- **Languages**: English (primary), limited multilingual samples

#### 3.3.2 User Accounts
- **Test Users**: 10 accounts with varying usage patterns
- **Admin User**: For monitoring and analytics (if applicable)
- **Heavy User**: 100+ documents for scale testing
- **New User**: Empty state testing

#### 3.3.3 Metadata
- Comprehensive metadata combinations
- Edge cases (special characters, long text, null values)

---

## 4. RISK ASSESSMENT

### 4.1 High-Risk Areas

| Risk Area | Impact | Likelihood | Mitigation Strategy |
|-----------|--------|------------|---------------------|
| External Service Outages (Document AI, Vertex AI) | High | Medium | Implement circuit breakers, comprehensive retry logic, monitor health |
| Database Connection Pool Exhaustion | High | Medium | Strict connection management, monitoring, alerting |
| Large Document Processing (>25 MB) | High | Medium | Chunked processing, timeout enforcement, memory optimization |
| Stuck Job Recovery Failures | High | Low | Extensive testing, monitoring, manual intervention procedures |
| RLS Policy Bypass | Critical | Low | Comprehensive security testing, penetration testing |
| Data Loss During Cancellation | High | Low | Transaction management, cleanup verification tests |

### 4.2 Medium-Risk Areas

| Risk Area | Impact | Likelihood | Mitigation Strategy |
|-----------|--------|------------|---------------------|
| Search Result Accuracy | Medium | Medium | Extensive similarity algorithm validation, A/B testing |
| Concurrent Upload Race Conditions | Medium | Low | Atomic operations, extensive concurrency testing |
| Rate Limiting Bypass | Medium | Low | Thorough rate limit testing |
| Memory Leaks in Long-Running Jobs | Medium | Medium | Memory profiling, garbage collection monitoring |

### 4.3 Low-Risk Areas
- UI rendering issues (mature component library)
- Authentication flow (proven Supabase Auth)
- Storage operations (managed by Supabase)

---

## 5. RESOURCE REQUIREMENTS

### 5.1 Team Resources

| Role | Responsibility | FTE |
|------|---------------|-----|
| QA Lead | Test strategy, planning, reporting | 1.0 |
| QA Engineers | Test execution, automation | 2.0 |
| Security Tester | Security testing, vulnerability assessment | 0.5 |
| Performance Tester | Load testing, performance optimization | 0.5 |
| Developers | Unit tests, bug fixes | 2.0 |

### 5.2 Infrastructure Resources
- **Test Environments**: Dev, Staging, Production-like
- **Test Data Storage**: 10 GB for sample documents
- **Cloud Resources**: Google Cloud test project, Qdrant test cluster
- **CI/CD**: GitHub Actions (included in repository)
- **Monitoring**: Sentry, Datadog, or similar (TBD)

### 5.3 Tools & Licenses

| Tool | Purpose | License |
|------|---------|---------|
| Jest | Unit testing | Open Source |
| Playwright | E2E testing | Open Source |
| k6 | Load testing | Open Source |
| OWASP ZAP | Security testing | Open Source |
| Google Cloud | Document AI, Vertex AI | Pay-as-you-go |
| Qdrant Cloud | Vector search | Free tier + paid |
| Supabase Cloud | Database, storage | Free tier + paid |

---

## 6. TEST SCHEDULE & MILESTONES

### Phase 1: Test Preparation (Week 1-2)
- [ ] Finalize test plan (this document)
- [ ] Set up test environments
- [ ] Prepare test data
- [ ] Create test cases
- [ ] Set up automation framework

### Phase 2: Functional Testing (Week 3-4)
- [ ] Execute functional test cases
- [ ] Log defects
- [ ] Retest fixes
- [ ] Achieve P0/P1 pass criteria

### Phase 3: Non-Functional Testing (Week 5)
- [ ] Performance testing
- [ ] Security testing
- [ ] Reliability testing
- [ ] Load/stress testing

### Phase 4: Integration Testing (Week 6)
- [ ] External service integration tests
- [ ] End-to-end workflows
- [ ] Cross-browser testing
- [ ] UAT preparation

### Phase 5: Regression & UAT (Week 7)
- [ ] Full regression suite
- [ ] UAT execution
- [ ] Production readiness review
- [ ] Sign-off

### Phase 6: Production Deployment (Week 8)
- [ ] Pre-deployment smoke tests
- [ ] Production deployment
- [ ] Post-deployment verification
- [ ] Monitoring setup

---

## 7. ENTRY & EXIT CRITERIA

### 7.1 Entry Criteria (Start Testing)
✅ All features implemented and code-complete
✅ Test environments provisioned and accessible
✅ Test data prepared
✅ Test cases reviewed and approved
✅ No P0/P1 build-breaking defects

### 7.2 Exit Criteria (Release to Production)
✅ **P0 Tests**: 100% pass rate
✅ **P1 Tests**: ≥95% pass rate
✅ **P2 Tests**: ≥90% pass rate
✅ **Zero Critical/Blocker defects** open
✅ **All High defects** resolved or deferred with mitigation plan
✅ **Performance benchmarks** met:
- Document upload: <3 seconds
- Search query: <5 seconds
- Dashboard load: <2 seconds
- Document processing: <10 minutes (median for 20-page doc)

✅ **Security scan**: No high/critical vulnerabilities
✅ **Code coverage**: ≥80% for critical paths
✅ **UAT sign-off** from stakeholders
✅ **Production monitoring** configured
✅ **Rollback plan** documented and tested

---

## 8. DEFECT MANAGEMENT

### 8.1 Defect Severity Definitions

| Severity | Definition | Example | Response Time |
|----------|------------|---------|---------------|
| **P0 - Critical** | System crash, data loss, security breach | Database corruption, RLS bypass | Immediate (2 hours) |
| **P1 - High** | Major feature broken, no workaround | Upload fails, search returns no results | Same day (8 hours) |
| **P2 - Medium** | Feature broken with workaround | Pagination broken, retry button unresponsive | 2-3 days |
| **P3 - Low** | Minor issue, cosmetic | Typo, alignment issue | Next sprint |

### 8.2 Defect Workflow
1. **Discovery**: Tester finds issue
2. **Logging**: Create defect in issue tracker (GitHub Issues)
3. **Triage**: Product + Dev + QA prioritize
4. **Assignment**: Dev team member assigned
5. **Fix**: Developer resolves defect
6. **Verification**: QA retests
7. **Closure**: Defect closed if verified

### 8.3 Defect Tracking
- **Tool**: GitHub Issues with labels
- **Labels**: `bug`, `P0`, `P1`, `P2`, `P3`, `security`, `performance`
- **Reports**: Daily defect summary, weekly trend analysis

---

## 9. TEST DELIVERABLES

### 9.1 Planning Phase
- ✅ TEST_PLAN_MASTER.md (this document)
- ✅ TEST_CASES_FUNCTIONAL.md
- ✅ TEST_CASES_NON_FUNCTIONAL.md
- ✅ TEST_CASES_INTEGRATION.md
- ✅ TEST_DATA.md
- ✅ SMOKE_TESTS.md
- ✅ CRITICAL_PATH.md

### 9.2 Execution Phase
- Test execution reports (daily)
- Defect reports (daily)
- Progress dashboard
- Blocked test cases log

### 9.3 Completion Phase
- Final test summary report
- Code coverage report
- Performance test results
- Security scan results
- UAT sign-off document
- Production readiness checklist

---

## 10. TEST METRICS

### 10.1 Metrics to Track

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Test Case Execution Rate | 95%+ | TBD | 🟡 |
| Pass Rate (P0) | 100% | TBD | 🟡 |
| Pass Rate (P1) | ≥95% | TBD | 🟡 |
| Pass Rate (P2) | ≥90% | TBD | 🟡 |
| Defect Density | <5 defects per feature | TBD | 🟡 |
| Critical Defects | 0 | TBD | 🟡 |
| Code Coverage | ≥80% | TBD | 🟡 |
| Performance (Upload) | <3s | TBD | 🟡 |
| Performance (Search) | <5s | TBD | 🟡 |

### 10.2 Reporting Frequency
- **Daily**: Test execution progress, defects logged/resolved
- **Weekly**: Trend analysis, risk assessment updates
- **End of Phase**: Comprehensive phase report
- **Final**: Complete test summary report

---

## 11. ASSUMPTIONS & DEPENDENCIES

### 11.1 Assumptions
- Development team delivers code on schedule
- Test environments are stable and available
- Test data can be prepared without legal/compliance issues
- External services (Google Cloud, Qdrant) remain available
- Adequate hardware resources for load testing

### 11.2 Dependencies
- **Development**: Code completion per schedule
- **DevOps**: Environment provisioning and CI/CD setup
- **Product**: Requirements clarification and UAT availability
- **Security**: Security scan tool access
- **External Services**: Google Cloud credits, Qdrant cluster access

---

## 12. COMMUNICATION PLAN

### 12.1 Stakeholders
- Product Manager
- Engineering Lead
- QA Lead
- DevOps Lead
- Security Lead

### 12.2 Reporting
- **Daily Standup**: Test progress, blockers
- **Weekly Status**: Email summary to stakeholders
- **Phase Completion**: Formal report with metrics
- **Issues**: Immediate escalation for P0/P1 defects

### 12.3 Escalation Path
1. **QA Engineer** → QA Lead (technical issues)
2. **QA Lead** → Engineering Lead (development blockers)
3. **Engineering Lead** → Product Manager (schedule/scope issues)
4. **Product Manager** → Executive Team (critical decisions)

---

## 13. APPROVAL & SIGN-OFF

### 13.1 Test Plan Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | _____________ | _____________ | _______ |
| Engineering Lead | _____________ | _____________ | _______ |
| Product Manager | _____________ | _____________ | _______ |

### 13.2 Production Release Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | _____________ | _____________ | _______ |
| Engineering Lead | _____________ | _____________ | _______ |
| Product Manager | _____________ | _____________ | _______ |
| Security Lead | _____________ | _____________ | _______ |

---

## APPENDICES

### Appendix A: Referenced Documents
- TEST_CASES_FUNCTIONAL.md - Functional test cases
- TEST_CASES_NON_FUNCTIONAL.md - Performance, security, reliability tests
- TEST_CASES_INTEGRATION.md - Integration test cases
- SMOKE_TESTS.md - Smoke test suite
- CRITICAL_PATH.md - Critical path checklist
- TEST_DATA.md - Test data specification
- TEST_METRICS.md - Detailed metrics tracking

### Appendix B: Environment URLs
- **Development**: http://localhost:3000
- **Staging**: TBD
- **Production**: TBD

### Appendix C: Contact Information
- **QA Lead**: TBD
- **Engineering Lead**: TBD
- **Product Manager**: TBD
- **On-Call**: TBD

---

**Document Control:**
- **Version History**:
  - v1.0 (2025-11-24): Initial draft
- **Next Review Date**: TBD
- **Document Owner**: QA Lead

---

*END OF MASTER TEST PLAN*
