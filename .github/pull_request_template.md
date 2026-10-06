## Description
<!-- Provide a brief description of the changes introduced by this PR -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] ♻️ Refactoring / Code style update
- [ ] 📝 Documentation update
- [ ] 🧪 Tests (unit, integration, or E2E)

## Non-Negotiable Architectural Checklist
- [ ] Database-level constraints applied for double booking prevention
- [ ] Monetary values strictly use `BigDecimal` with 2 decimal places (HALF_UP), minor units
- [ ] Timestamps stored as UTC `Instant`, club timezone (`Asia/Kolkata`) applied for day boundaries
- [ ] `Idempotency-Key` header implemented for payment, booking, and order mutations
- [ ] Flyway migrations used exclusively (no Hibernate `ddl-auto` update/create)
- [ ] Referenced data uses soft delete
- [ ] Unit + Testcontainers integration tests included and passing
- [ ] Sensitive operations audit-logged
- [ ] Modern UI, accessible, dark-mode supported, skeleton loaders implemented

## Related Issues
Closes #
