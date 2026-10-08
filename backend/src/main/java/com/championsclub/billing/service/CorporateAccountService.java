package com.championsclub.billing.service;

import com.championsclub.billing.domain.CorporateAccount;
import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.InvoiceStatus;
import com.championsclub.billing.dto.*;
import com.championsclub.billing.repo.CorporateAccountRepository;
import com.championsclub.billing.repo.InvoiceRepository;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CorporateAccountService {

    private final CorporateAccountRepository corporateAccountRepository;
    private final MemberRepository memberRepository;
    private final PlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;

    private static final String GSTIN_REGEX = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$";

    @Transactional
    public CorporateAccountResponse createAccount(CorporateAccountRequest req) {
        validateGstin(req.getGstin());

        if (corporateAccountRepository.existsByGstin(req.getGstin().trim())) {
            throw new BusinessValidationException("Corporate account with GSTIN " + req.getGstin() + " already exists", "DUPLICATE_GSTIN");
        }

        CorporateAccount account = CorporateAccount.builder()
                .companyName(req.getCompanyName().trim())
                .gstin(req.getGstin().trim().toUpperCase())
                .billingAddress(req.getBillingAddress().trim())
                .contactPerson(req.getContactPerson())
                .contactEmail(req.getContactEmail())
                .contactPhone(req.getContactPhone())
                .creditLimit(req.getCreditLimit() != null ? req.getCreditLimit().setScale(2, RoundingMode.HALF_UP) : new BigDecimal("50000.00"))
                .usedCredit(BigDecimal.ZERO)
                .paymentTerms(req.getPaymentTerms() != null ? req.getPaymentTerms() : "NET_30")
                .isActive(true)
                .build();

        CorporateAccount saved = corporateAccountRepository.save(account);
        return mapToResponse(saved);
    }

    @Transactional
    public CorporateAccountResponse updateAccount(UUID id, CorporateAccountRequest req) {
        CorporateAccount account = corporateAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateAccount", id));

        if (!account.getGstin().equalsIgnoreCase(req.getGstin().trim())) {
            validateGstin(req.getGstin());
            Optional<CorporateAccount> other = corporateAccountRepository.findByGstin(req.getGstin().trim());
            if (other.isPresent() && !other.get().getId().equals(id)) {
                throw new BusinessValidationException("GSTIN " + req.getGstin() + " belongs to another corporate account", "DUPLICATE_GSTIN");
            }
            account.setGstin(req.getGstin().trim().toUpperCase());
        }

        account.setCompanyName(req.getCompanyName().trim());
        account.setBillingAddress(req.getBillingAddress().trim());
        account.setContactPerson(req.getContactPerson());
        account.setContactEmail(req.getContactEmail());
        account.setContactPhone(req.getContactPhone());
        if (req.getCreditLimit() != null) {
            account.setCreditLimit(req.getCreditLimit().setScale(2, RoundingMode.HALF_UP));
        }
        if (req.getPaymentTerms() != null) {
            account.setPaymentTerms(req.getPaymentTerms());
        }

        CorporateAccount saved = corporateAccountRepository.save(account);
        return mapToResponse(saved);
    }

    @Transactional
    public void validateAndChargeCredit(UUID accountId, BigDecimal amount, boolean managerOverride) {
        CorporateAccount account = corporateAccountRepository.findByIdWithLock(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateAccount", accountId));

        if (!account.getIsActive()) {
            throw new BusinessValidationException("Corporate account is deactivated", "CORPORATE_ACCOUNT_INACTIVE");
        }

        BigDecimal chargeAmt = amount.setScale(2, RoundingMode.HALF_UP);
        BigDecimal newUsed = account.getUsedCredit().add(chargeAmt);

        if (newUsed.compareTo(account.getCreditLimit()) > 0 && !managerOverride) {
            throw new BusinessValidationException(
                    String.format("Corporate credit limit exceeded. Limit: ₹%s, Currently Used: ₹%s, Attempted Charge: ₹%s. Manager override required.",
                            account.getCreditLimit(), account.getUsedCredit(), chargeAmt),
                    "CREDIT_LIMIT_EXCEEDED"
            );
        }

        account.setUsedCredit(newUsed);
        corporateAccountRepository.save(account);
    }

    @Transactional
    public void releaseCredit(UUID accountId, BigDecimal amount) {
        CorporateAccount account = corporateAccountRepository.findByIdWithLock(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateAccount", accountId));

        BigDecimal creditRelease = amount.setScale(2, RoundingMode.HALF_UP);
        BigDecimal newUsed = account.getUsedCredit().subtract(creditRelease);
        if (newUsed.compareTo(BigDecimal.ZERO) < 0) {
            newUsed = BigDecimal.ZERO;
        }
        account.setUsedCredit(newUsed);
        corporateAccountRepository.save(account);
    }

    @Transactional
    public List<Member> bulkOnboardCorporateMembers(BulkCorporateMembersRequest req, User admin) {
        CorporateAccount account = corporateAccountRepository.findById(req.getCorporateAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("CorporateAccount", req.getCorporateAccountId()));

        Plan plan = planRepository.findById(req.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Plan", req.getPlanId()));

        List<Member> savedMembers = new ArrayList<>();
        LocalDate now = LocalDate.now();
        LocalDate endDate = now.plusMonths(plan.getDurationMonths());

        for (BulkCorporateMembersRequest.CorporateEmployeeDto emp : req.getEmployees()) {
            // Check if phone or email already in use
            if (memberRepository.findByPhoneAndIsDeletedFalse(emp.getPhone().trim()).isPresent()) {
                log.warn("Skipping corporate member onboarding: Phone {} already registered", emp.getPhone());
                continue;
            }

            String memberNo = "CORP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

            Member member = Member.builder()
                    .memberNo(memberNo)
                    .fullName(emp.getFullName().trim())
                    .email(emp.getEmail().trim().toLowerCase())
                    .phone(emp.getPhone().trim())
                    .dob(LocalDate.of(1990, 1, 1)) // Default adult DOB
                    .status(MemberStatus.ACTIVE)
                    .plan(plan)
                    .corporateAccount(account)
                    .corporateEmployeeId(emp.getCorporateEmployeeId())
                    .canChargeToCompany(emp.isCanChargeToCompany())
                    .startDate(now)
                    .endDate(endDate)
                    .walletBalance(BigDecimal.ZERO)
                    .guestPassesRemaining(2)
                    .notes("Onboarded via corporate plan for " + account.getCompanyName() + " at negotiated price: ₹" + req.getNegotiatedPlanPrice())
                    .build();

            savedMembers.add(memberRepository.save(member));
        }

        return savedMembers;
    }

    @Transactional(readOnly = true)
    public AgingReportResponse getAgingReport() {
        List<CorporateAccount> accounts = corporateAccountRepository.findAll();
        LocalDate today = LocalDate.now();

        BigDecimal totalCurrent = BigDecimal.ZERO;
        BigDecimal totalDays1to30 = BigDecimal.ZERO;
        BigDecimal totalDays31to60 = BigDecimal.ZERO;
        BigDecimal totalDays61to90 = BigDecimal.ZERO;
        BigDecimal totalDays90Plus = BigDecimal.ZERO;

        List<AgingReportResponse.CorporateAgingItemDto> items = new ArrayList<>();

        for (CorporateAccount acc : accounts) {
            List<Invoice> unpaid = invoiceRepository.findByCorporateAccountIdAndStatusIn(
                    acc.getId(), List.of(InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT)
            );

            BigDecimal current = BigDecimal.ZERO;
            BigDecimal d1to30 = BigDecimal.ZERO;
            BigDecimal d31to60 = BigDecimal.ZERO;
            BigDecimal d61to90 = BigDecimal.ZERO;
            BigDecimal d90plus = BigDecimal.ZERO;

            for (Invoice inv : unpaid) {
                BigDecimal bal = inv.getBalanceDue();
                LocalDate dueDate = inv.getDueDate() != null ? inv.getDueDate() : inv.getIssueDate().plusDays(30);

                if (!today.isAfter(dueDate)) {
                    current = current.add(bal);
                } else {
                    long daysOverdue = ChronoUnit.DAYS.between(dueDate, today);
                    if (daysOverdue <= 30) {
                        d1to30 = d1to30.add(bal);
                    } else if (daysOverdue <= 60) {
                        d31to60 = d31to60.add(bal);
                    } else if (daysOverdue <= 90) {
                        d61to90 = d61to90.add(bal);
                    } else {
                        d90plus = d90plus.add(bal);
                    }
                }
            }

            BigDecimal totalDue = current.add(d1to30).add(d31to60).add(d61to90).add(d90plus);

            totalCurrent = totalCurrent.add(current);
            totalDays1to30 = totalDays1to30.add(d1to30);
            totalDays31to60 = totalDays31to60.add(d31to60);
            totalDays61to90 = totalDays61to90.add(d61to90);
            totalDays90Plus = totalDays90Plus.add(d90plus);

            items.add(AgingReportResponse.CorporateAgingItemDto.builder()
                    .corporateAccountId(acc.getId())
                    .companyName(acc.getCompanyName())
                    .gstin(acc.getGstin())
                    .paymentTerms(acc.getPaymentTerms())
                    .creditLimit(acc.getCreditLimit())
                    .usedCredit(acc.getUsedCredit())
                    .current(current)
                    .days1to30(d1to30)
                    .days31to60(d31to60)
                    .days61to90(d61to90)
                    .days90Plus(d90plus)
                    .totalDue(totalDue)
                    .build());
        }

        BigDecimal grandTotal = totalCurrent.add(totalDays1to30).add(totalDays31to60).add(totalDays61to90).add(totalDays90Plus);

        return AgingReportResponse.builder()
                .totalCurrent(totalCurrent)
                .totalDays1to30(totalDays1to30)
                .totalDays31to60(totalDays31to60)
                .totalDays61to90(totalDays61to90)
                .totalDays90Plus(totalDays90Plus)
                .totalOutstanding(grandTotal)
                .items(items)
                .build();
    }

    @Transactional(readOnly = true)
    public List<CorporateAccountResponse> getAllAccounts() {
        return corporateAccountRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CorporateAccountResponse getAccountById(UUID id) {
        CorporateAccount acc = corporateAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateAccount", id));
        return mapToResponse(acc);
    }

    public void validateGstin(String gstin) {
        if (gstin == null || !gstin.trim().matches(GSTIN_REGEX)) {
            throw new BusinessValidationException(
                    "Invalid GSTIN format: '" + gstin + "'. Must be a 15-character valid Indian GSTIN (e.g. 29ABCDE1234F1Z5).",
                    "INVALID_GSTIN_FORMAT"
            );
        }
    }

    public CorporateAccountResponse mapToResponse(CorporateAccount acc) {
        return CorporateAccountResponse.builder()
                .id(acc.getId())
                .companyName(acc.getCompanyName())
                .gstin(acc.getGstin())
                .billingAddress(acc.getBillingAddress())
                .contactPerson(acc.getContactPerson())
                .contactEmail(acc.getContactEmail())
                .contactPhone(acc.getContactPhone())
                .creditLimit(acc.getCreditLimit())
                .usedCredit(acc.getUsedCredit())
                .availableCredit(acc.getAvailableCredit())
                .paymentTerms(acc.getPaymentTerms())
                .isActive(acc.getIsActive())
                .createdAt(acc.getCreatedAt())
                .updatedAt(acc.getUpdatedAt())
                .build();
    }
}
