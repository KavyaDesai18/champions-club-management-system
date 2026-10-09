package com.championsclub.crm.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.security.Role;
import com.championsclub.crm.domain.Lead;
import com.championsclub.crm.domain.LeadActivity;
import com.championsclub.crm.domain.LeadActivityType;
import com.championsclub.crm.domain.LeadSource;
import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.domain.Quote;
import com.championsclub.crm.domain.QuoteStatus;
import com.championsclub.crm.dto.AddLeadActivityRequest;
import com.championsclub.crm.dto.ConvertLeadRequest;
import com.championsclub.crm.dto.CrmFunnelStatsDto;
import com.championsclub.crm.dto.LeadActivityDto;
import com.championsclub.crm.dto.LeadDto;
import com.championsclub.crm.dto.PublicEnquiryRequest;
import com.championsclub.crm.dto.QuoteDto;
import com.championsclub.crm.dto.ScheduleFollowUpRequest;
import com.championsclub.crm.dto.UpdateLeadStatusRequest;
import com.championsclub.crm.repo.LeadActivityRepository;
import com.championsclub.crm.repo.LeadRepository;
import com.championsclub.crm.repo.QuoteRepository;
import com.championsclub.crm.util.RateLimiter;
import com.championsclub.crm.util.XssSanitizer;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.dto.Member360Dto;
import com.championsclub.member.dto.RegisterMemberRequest;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.member.service.MemberService;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class LeadService {

    private static final Logger log = LoggerFactory.getLogger(LeadService.class);

    private final LeadRepository leadRepository;
    private final LeadActivityRepository activityRepository;
    private final QuoteRepository quoteRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final MemberService memberService;
    private final NotificationDispatcher notificationDispatcher;
    private final RateLimiter rateLimiter;
    private final XssSanitizer xssSanitizer;

    private final AtomicInteger roundRobinCounter = new AtomicInteger(0);

    public LeadService(
            LeadRepository leadRepository,
            LeadActivityRepository activityRepository,
            QuoteRepository quoteRepository,
            UserRepository userRepository,
            MemberRepository memberRepository,
            MemberService memberService,
            NotificationDispatcher notificationDispatcher,
            RateLimiter rateLimiter,
            XssSanitizer xssSanitizer
    ) {
        this.leadRepository = leadRepository;
        this.activityRepository = activityRepository;
        this.quoteRepository = quoteRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.memberService = memberService;
        this.notificationDispatcher = notificationDispatcher;
        this.rateLimiter = rateLimiter;
        this.xssSanitizer = xssSanitizer;
    }

    @Transactional
    public LeadDto processEnquiry(PublicEnquiryRequest request, String clientIp) {
        // 1. Rate limiting
        if (!rateLimiter.tryAcquire(clientIp)) {
            throw new BusinessValidationException(
                    "Too many submissions from your connection. Please wait a minute and try again.",
                    "RATE_LIMIT_EXCEEDED"
            );
        }

        // 2. Honeypot check (Bot detection)
        if (request.getWebsite_hp() != null && !request.getWebsite_hp().isBlank()) {
            log.warn("Spam honeypot triggered by IP: {}, returning dummy success", clientIp);
            return LeadDto.builder()
                    .id(UUID.randomUUID())
                    .name(request.getName())
                    .status(LeadStatus.NEW)
                    .createdAt(Instant.now())
                    .build();
        }

        // 3. Validation: Contact Method Required
        boolean hasEmail = request.getEmail() != null && !request.getEmail().trim().isBlank();
        boolean hasPhone = request.getPhone() != null && !request.getPhone().trim().isBlank();
        if (!hasEmail && !hasPhone) {
            throw new BusinessValidationException(
                    "Please provide at least one contact method (email address or phone number).",
                    "MISSING_CONTACT_METHOD"
            );
        }

        // 4. Sanitize inputs to prevent XSS
        String cleanName = xssSanitizer.sanitize(request.getName().trim());
        String cleanEmail = hasEmail ? request.getEmail().trim().toLowerCase() : null;
        String cleanPhone = hasPhone ? request.getPhone().trim() : null;
        String cleanInterest = request.getInterest() != null ? xssSanitizer.sanitize(request.getInterest().trim()) : null;
        String cleanMessage = request.getMessage() != null ? xssSanitizer.sanitize(request.getMessage().trim()) : null;

        // Truncate message if abnormally large
        if (cleanMessage != null && cleanMessage.length() > 2000) {
            cleanMessage = cleanMessage.substring(0, 2000);
        }

        // 5. Duplicate lead detection & merge
        Optional<Lead> existingLead = Optional.empty();
        if (cleanEmail != null) {
            existingLead = leadRepository.findByEmailIgnoreCase(cleanEmail);
        }
        if (existingLead.isEmpty() && cleanPhone != null) {
            existingLead = leadRepository.findByPhone(cleanPhone);
        }

        if (existingLead.isPresent()) {
            Lead lead = existingLead.get();
            lead.setUpdatedAt(Instant.now());
            if (cleanInterest != null && (lead.getInterest() == null || lead.getInterest().isBlank())) {
                lead.setInterest(cleanInterest);
            }
            // If lead was in LOST status, we can reopen to CONTACTED
            if (lead.getStatus() == LeadStatus.LOST) {
                lead.setStatus(LeadStatus.CONTACTED);
            }
            leadRepository.save(lead);

            // Append lead activity for the repeated enquiry
            String details = "Repeated website enquiry received. " + (cleanMessage != null ? "Message: " + cleanMessage : "");
            LeadActivity activity = LeadActivity.builder()
                    .leadId(lead.getId())
                    .type(LeadActivityType.ENQUIRY_UPDATE)
                    .details(details)
                    .performerName("Website Bot")
                    .createdAt(Instant.now())
                    .build();
            activityRepository.save(activity);

            log.info("Merged duplicate enquiry into existing lead ID: {}", lead.getId());
            return mapToDto(lead, true);
        }

        // 6. Round-robin staff assignment
        User assignedStaff = getNextStaffAssignee();

        // 7. Create new lead
        Lead newLead = Lead.builder()
                .name(cleanName)
                .email(cleanEmail)
                .phone(cleanPhone)
                .source(request.getSource() != null ? request.getSource() : LeadSource.WEB_FORM)
                .interest(cleanInterest)
                .message(cleanMessage)
                .status(LeadStatus.NEW)
                .assignedTo(assignedStaff)
                .followUpAt(Instant.now().plusSeconds(86400)) // Default 24h follow up
                .consent(request.getConsent() != null ? request.getConsent() : true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        newLead = leadRepository.save(newLead);

        // 8. Record initial activity
        LeadActivity initialActivity = LeadActivity.builder()
                .leadId(newLead.getId())
                .type(LeadActivityType.SYSTEM)
                .details("New enquiry submitted via " + newLead.getSource() + 
                         (cleanInterest != null ? " for " + cleanInterest : "") +
                         (assignedStaff != null ? ". Assigned to " + assignedStaff.getFullName() : ""))
                .performerName("Website Bot")
                .createdAt(Instant.now())
                .build();
        activityRepository.save(initialActivity);

        // 9. Instant staff notification (Resilient: failure does NOT fail enquiry creation)
        if (assignedStaff != null) {
            try {
                notificationDispatcher.dispatch(
                        assignedStaff,
                        null,
                        "New Lead Assigned: " + cleanName,
                        "A new enquiry regarding " + (cleanInterest != null ? cleanInterest : "Membership") + 
                        " has been submitted and assigned to you.",
                        NotificationType.SYSTEM,
                        "{\"leadId\":\"" + newLead.getId() + "\"}"
                );
            } catch (Exception ex) {
                log.warn("Staff notification delivery failed (enquiry still saved): {}", ex.getMessage());
            }
        }

        return mapToDto(newLead, true);
    }

    private User getNextStaffAssignee() {
        try {
            List<User> staffList = userRepository.findByRoleInAndStatusAndIsDeletedFalseOrderByCreatedAtAsc(
                    List.of(Role.OWNER, Role.MANAGER, Role.FRONT_DESK),
                    "ACTIVE"
            );
            if (staffList.isEmpty()) {
                return null;
            }
            int index = Math.abs(roundRobinCounter.getAndIncrement() % staffList.size());
            return staffList.get(index);
        } catch (Exception ex) {
            log.warn("Error resolving round-robin staff assignee: {}", ex.getMessage());
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<LeadDto> getLeads(LeadStatus status, String search) {
        List<Lead> leads;
        if (search != null && !search.trim().isBlank()) {
            leads = leadRepository.searchLeads(search.trim());
        } else if (status != null) {
            leads = leadRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            leads = leadRepository.findAllByOrderByCreatedAtDesc();
        }
        return leads.stream().map(l -> mapToDto(l, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<LeadDto> getOverdueFollowUps() {
        List<Lead> overdue = leadRepository.findOverdueFollowUps(
                Instant.now(),
                List.of(LeadStatus.WON, LeadStatus.LOST)
        );
        return overdue.stream().map(l -> mapToDto(l, false)).toList();
    }

    @Transactional(readOnly = true)
    public LeadDto getLeadById(UUID id) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + id));
        return mapToDto(lead, true);
    }

    @Transactional
    public LeadDto updateLeadStatus(UUID leadId, UpdateLeadStatusRequest request, User actor) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + leadId));

        if (request.getStatus() == LeadStatus.LOST && 
                (request.getLostReason() == null || request.getLostReason().trim().isBlank())) {
            throw new BusinessValidationException(
                    "Lost reason is required when marking a lead as LOST.",
                    "LOST_REASON_REQUIRED"
            );
        }

        LeadStatus oldStatus = lead.getStatus();
        lead.setStatus(request.getStatus());
        if (request.getStatus() == LeadStatus.LOST) {
            lead.setLostReason(xssSanitizer.sanitize(request.getLostReason().trim()));
        }
        lead.setUpdatedAt(Instant.now());
        leadRepository.save(lead);

        String performerName = actor != null ? actor.getFullName() : "Staff";
        String details = "Status changed from " + oldStatus + " to " + request.getStatus() +
                (request.getNote() != null ? ". Note: " + xssSanitizer.sanitize(request.getNote().trim()) : "");

        LeadActivity activity = LeadActivity.builder()
                .leadId(lead.getId())
                .type(LeadActivityType.STATUS_CHANGE)
                .details(details)
                .performedBy(actor)
                .performerName(performerName)
                .createdAt(Instant.now())
                .build();
        activityRepository.save(activity);

        return mapToDto(lead, true);
    }

    @Transactional
    public LeadActivityDto addActivity(UUID leadId, AddLeadActivityRequest request, User actor) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + leadId));

        String cleanDetails = xssSanitizer.sanitize(request.getDetails().trim());
        String performerName = actor != null ? actor.getFullName() : "Staff";

        LeadActivity activity = LeadActivity.builder()
                .leadId(lead.getId())
                .type(request.getType())
                .details(cleanDetails)
                .performedBy(actor)
                .performerName(performerName)
                .createdAt(Instant.now())
                .build();

        activity = activityRepository.save(activity);
        lead.setUpdatedAt(Instant.now());
        leadRepository.save(lead);

        return mapActivityToDto(activity);
    }

    @Transactional
    public LeadDto scheduleFollowUp(UUID leadId, ScheduleFollowUpRequest request, User actor) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + leadId));

        lead.setFollowUpAt(request.getFollowUpAt());
        lead.setUpdatedAt(Instant.now());
        leadRepository.save(lead);

        String performerName = actor != null ? actor.getFullName() : "Staff";
        String details = "Scheduled follow-up for " + request.getFollowUpAt() +
                (request.getNote() != null ? ". " + xssSanitizer.sanitize(request.getNote().trim()) : "");

        LeadActivity activity = LeadActivity.builder()
                .leadId(lead.getId())
                .type(LeadActivityType.NOTE)
                .details(details)
                .performedBy(actor)
                .performerName(performerName)
                .createdAt(Instant.now())
                .build();
        activityRepository.save(activity);

        return mapToDto(lead, true);
    }

    @Transactional
    public LeadDto convertLeadToMember(UUID leadId, ConvertLeadRequest request, User actor) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + leadId));

        // Edge case: lead already converted or person already a member
        if (lead.getConvertedMemberId() != null) {
            throw new BusinessValidationException(
                    "This lead has already been converted to a member.",
                    "LEAD_ALREADY_CONVERTED"
            );
        }

        if (lead.getEmail() != null) {
            Optional<Member> existingEmail = memberRepository.findByEmailAndIsDeletedFalse(lead.getEmail().toLowerCase().trim());
            if (existingEmail.isPresent()) {
                throw new BusinessValidationException(
                        "A member with this email address is already active in the club: " + existingEmail.get().getMemberNo(),
                        "ALREADY_A_MEMBER"
                );
            }
        }

        if (lead.getPhone() != null) {
            Optional<Member> existingPhone = memberRepository.findByPhoneAndIsDeletedFalse(lead.getPhone().trim());
            if (existingPhone.isPresent()) {
                throw new BusinessValidationException(
                        "A member with this phone number is already active in the club: " + existingPhone.get().getMemberNo(),
                        "ALREADY_A_MEMBER"
                );
            }
        }

        // Prefill registration request
        LocalDate dob = request.getDob() != null ? request.getDob() : LocalDate.of(1996, 6, 15);
        String planCode = request.getPlanCode() != null && !request.getPlanCode().isBlank() ? request.getPlanCode() : "SILVER";

        RegisterMemberRequest regReq = RegisterMemberRequest.builder()
                .fullName(lead.getName())
                .email(lead.getEmail() != null ? lead.getEmail() : "member." + lead.getId().toString().substring(0, 8) + "@championsclub.com")
                .phone(lead.getPhone() != null ? lead.getPhone() : "+919999999999")
                .dob(dob)
                .gender(request.getGender())
                .address(request.getAddress())
                .emergencyContact(request.getEmergencyContact())
                .planCode(planCode)
                .createPortalAccount(Boolean.TRUE.equals(request.getCreatePortalAccount()))
                .portalPassword(request.getPortalPassword())
                .build();

        String actorEmail = actor != null ? actor.getEmail() : "system@championsclub.com";
        Member360Dto newMember = memberService.registerMember(regReq, actorEmail);

        // Update lead state
        UUID memberId = newMember.getProfile().getId();
        String memberNo = newMember.getProfile().getMemberNo();
        String memberName = newMember.getProfile().getFullName();

        lead.setStatus(LeadStatus.WON);
        lead.setConvertedMemberId(memberId);
        lead.setUpdatedAt(Instant.now());
        leadRepository.save(lead);

        // Record conversion timeline
        String performerName = actor != null ? actor.getFullName() : "Staff";
        LeadActivity convActivity = LeadActivity.builder()
                .leadId(lead.getId())
                .type(LeadActivityType.CONVERTED)
                .details("Successfully converted to active Member " + memberNo + " on " + newMember.getPlan().getName() + " tier.")
                .performedBy(actor)
                .performerName(performerName)
                .createdAt(Instant.now())
                .build();
        activityRepository.save(convActivity);

        // Welcome flow:
        // 1. Send welcome message (email/SMS stub via NotificationDispatcher)
        try {
            if (newMember.getProfile().getUserId() != null) {
                User memberUser = userRepository.findById(newMember.getProfile().getUserId()).orElse(null);
                if (memberUser != null) {
                    notificationDispatcher.dispatch(
                            memberUser,
                            null,
                            "Welcome to Champions Club!",
                            "Welcome " + memberName + "! Your membership (" + memberNo + ") is now active. Explore court reservations and digital wallet.",
                            NotificationType.ACCOUNT,
                            "{\"voucher\":\"WELCOME100\",\"offer\":\"First-week 1 hr free court play\"}"
                    );
                }
            }
        } catch (Exception ex) {
            log.warn("Welcome notification dispatch failed: {}", ex.getMessage());
        }

        // 2. Front Desk Task: Club tour reminder
        try {
            User staffLead = actor != null ? actor : getNextStaffAssignee();
            if (staffLead != null) {
                notificationDispatcher.dispatch(
                        staffLead,
                        null,
                        "Front Desk Task: New Member Club Tour",
                        "Please conduct facility onboarding and equipment tour for new member " + memberName + " (" + memberNo + ").",
                        NotificationType.SYSTEM,
                        "{\"memberId\":\"" + memberId + "\"}"
                );
            }
        } catch (Exception ex) {
            log.warn("Front desk tour task dispatch failed: {}", ex.getMessage());
        }

        LeadDto result = mapToDto(lead, true);
        result.setConvertedMemberNo(memberNo);
        return result;
    }

    @Transactional(readOnly = true)
    public CrmFunnelStatsDto getFunnelStats() {
        long total = leadRepository.count();
        long newCnt = leadRepository.countByStatus(LeadStatus.NEW);
        long contactedCnt = leadRepository.countByStatus(LeadStatus.CONTACTED);
        long quoteSentCnt = leadRepository.countByStatus(LeadStatus.QUOTE_SENT);
        long trialCnt = leadRepository.countByStatus(LeadStatus.TRIAL_BOOKED);
        long wonCnt = leadRepository.countByStatus(LeadStatus.WON);
        long lostCnt = leadRepository.countByStatus(LeadStatus.LOST);

        BigDecimal winRate = total > 0
                ? BigDecimal.valueOf(wonCnt).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long overdueCnt = leadRepository.findOverdueFollowUps(
                Instant.now(),
                List.of(LeadStatus.WON, LeadStatus.LOST)
        ).size();

        long activeQuotes = quoteRepository.findAll().stream()
                .filter(q -> q.getStatus() == QuoteStatus.SENT && q.getValidUntil().isAfter(Instant.now()))
                .count();

        return CrmFunnelStatsDto.builder()
                .totalLeads(total)
                .newCount(newCnt)
                .contactedCount(contactedCnt)
                .quoteSentCount(quoteSentCnt)
                .trialBookedCount(trialCnt)
                .wonCount(wonCnt)
                .lostCount(lostCnt)
                .winRatePercentage(winRate)
                .overdueFollowUpsCount(overdueCnt)
                .activeQuotesCount(activeQuotes)
                .build();
    }

    private LeadDto mapToDto(Lead lead, boolean includeRelations) {
        boolean isOverdue = lead.getFollowUpAt() != null &&
                lead.getFollowUpAt().isBefore(Instant.now()) &&
                lead.getStatus() != LeadStatus.WON &&
                lead.getStatus() != LeadStatus.LOST;

        LeadDto.LeadDtoBuilder builder = LeadDto.builder()
                .id(lead.getId())
                .name(lead.getName())
                .email(lead.getEmail())
                .phone(lead.getPhone())
                .source(lead.getSource())
                .interest(lead.getInterest())
                .message(lead.getMessage())
                .status(lead.getStatus())
                .assignedToId(lead.getAssignedTo() != null ? lead.getAssignedTo().getId() : null)
                .assignedToName(lead.getAssignedTo() != null ? lead.getAssignedTo().getFullName() : null)
                .followUpAt(lead.getFollowUpAt())
                .lostReason(lead.getLostReason())
                .consent(lead.getConsent())
                .convertedMemberId(lead.getConvertedMemberId())
                .corporateAccountId(lead.getCorporateAccountId())
                .createdAt(lead.getCreatedAt())
                .updatedAt(lead.getUpdatedAt())
                .overdue(isOverdue);

        if (includeRelations) {
            List<LeadActivityDto> acts = activityRepository.findByLeadIdOrderByCreatedAtDesc(lead.getId())
                    .stream()
                    .map(this::mapActivityToDto)
                    .toList();
            builder.activities(acts);

            List<QuoteDto> quotes = quoteRepository.findByLeadIdOrderByCreatedAtDesc(lead.getId())
                    .stream()
                    .map(this::mapQuoteToDto)
                    .toList();
            builder.quotes(quotes);
        }

        return builder.build();
    }

    private LeadActivityDto mapActivityToDto(LeadActivity a) {
        return LeadActivityDto.builder()
                .id(a.getId())
                .leadId(a.getLeadId())
                .type(a.getType())
                .details(a.getDetails())
                .performedById(a.getPerformedBy() != null ? a.getPerformedBy().getId() : null)
                .performerName(a.getPerformerName())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private QuoteDto mapQuoteToDto(Quote q) {
        boolean isExpired = q.getValidUntil().isBefore(Instant.now()) && q.getStatus() == QuoteStatus.SENT;
        return QuoteDto.builder()
                .id(q.getId())
                .leadId(q.getLeadId())
                .quoteNumber(q.getQuoteNumber())
                .subtotal(q.getSubtotal())
                .tax(q.getTax())
                .total(q.getTotal())
                .validUntil(q.getValidUntil())
                .status(isExpired ? QuoteStatus.EXPIRED : q.getStatus())
                .pdfUrl(q.getPdfUrl())
                .notes(q.getNotes())
                .createdById(q.getCreatedBy() != null ? q.getCreatedBy().getId() : null)
                .createdByName(q.getCreatedBy() != null ? q.getCreatedBy().getFullName() : null)
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .expired(isExpired)
                .build();
    }
}
