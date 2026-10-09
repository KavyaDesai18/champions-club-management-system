package com.championsclub.crm.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingSource;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.PaymentStatus;
import com.championsclub.court.domain.Sport;
import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.court.dto.AvailabilitySlotDto;
import com.championsclub.court.dto.CourtAvailabilityDto;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.court.service.AvailabilityService;
import com.championsclub.crm.domain.Lead;
import com.championsclub.crm.domain.LeadActivity;
import com.championsclub.crm.domain.LeadActivityType;
import com.championsclub.crm.domain.LeadSource;
import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.dto.OnlineMembershipPurchaseRequest;
import com.championsclub.crm.dto.PublicCatalogItemDto;
import com.championsclub.crm.dto.PublicPlanDto;
import com.championsclub.crm.dto.PublicPriceDto;
import com.championsclub.crm.dto.PublicTrialBookingRequest;
import com.championsclub.crm.dto.TrialBookingConfirmationDto;
import com.championsclub.crm.repo.LeadActivityRepository;
import com.championsclub.crm.repo.LeadRepository;
import com.championsclub.crm.util.RateLimiter;
import com.championsclub.crm.util.XssSanitizer;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.dto.Member360Dto;
import com.championsclub.member.dto.PlanDto;
import com.championsclub.member.dto.RegisterMemberRequest;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.member.service.MemberService;
import com.championsclub.member.service.PlanService;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.shop.domain.Product;
import com.championsclub.shop.repo.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PublicApiService {

    private static final Logger log = LoggerFactory.getLogger(PublicApiService.class);
    private static final ZoneId CLUB_ZONE = ZoneId.of("Asia/Kolkata");

    private final LeadRepository leadRepository;
    private final LeadActivityRepository activityRepository;
    private final CourtRepository courtRepository;
    private final SportRepository sportRepository;
    private final BookingRepository bookingRepository;
    private final PlanService planService;
    private final MemberRepository memberRepository;
    private final MemberService memberService;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final AvailabilityService availabilityService;
    private final NotificationDispatcher notificationDispatcher;
    private final RateLimiter rateLimiter;
    private final XssSanitizer xssSanitizer;

    public PublicApiService(
            LeadRepository leadRepository,
            LeadActivityRepository activityRepository,
            CourtRepository courtRepository,
            SportRepository sportRepository,
            BookingRepository bookingRepository,
            PlanService planService,
            MemberRepository memberRepository,
            MemberService memberService,
            UserRepository userRepository,
            ProductRepository productRepository,
            AvailabilityService availabilityService,
            NotificationDispatcher notificationDispatcher,
            RateLimiter rateLimiter,
            XssSanitizer xssSanitizer
    ) {
        this.leadRepository = leadRepository;
        this.activityRepository = activityRepository;
        this.courtRepository = courtRepository;
        this.sportRepository = sportRepository;
        this.bookingRepository = bookingRepository;
        this.planService = planService;
        this.memberRepository = memberRepository;
        this.memberService = memberService;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.availabilityService = availabilityService;
        this.notificationDispatcher = notificationDispatcher;
        this.rateLimiter = rateLimiter;
        this.xssSanitizer = xssSanitizer;
    }

    @Transactional
    public TrialBookingConfirmationDto bookTrialSession(PublicTrialBookingRequest request, String clientIp) {
        // 1. Rate limiting
        if (!rateLimiter.tryAcquire(clientIp)) {
            throw new BusinessValidationException(
                    "Too many trial booking attempts from your connection. Please wait a minute and try again.",
                    "RATE_LIMIT_EXCEEDED"
            );
        }

        // 2. Honeypot check (Bot protection)
        if (request.getWebsite_hp() != null && !request.getWebsite_hp().isBlank()) {
            log.warn("Spam honeypot triggered on trial booking by IP: {}", clientIp);
            return TrialBookingConfirmationDto.builder()
                    .bookingReference("TR-HONEYPOT")
                    .courtName("Champions Arena")
                    .date(request.getDate())
                    .startTime(request.getStartTime())
                    .guestName(request.getName())
                    .guestPhone(request.getPhone())
                    .message("Trial session reserved successfully.")
                    .build();
        }

        // 3. Validation
        if (request.getPhone() == null || request.getPhone().trim().isBlank()) {
            throw new BusinessValidationException("Phone number is required for trial pass confirmation.", "MISSING_PHONE");
        }
        String cleanPhone = request.getPhone().trim();
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        String cleanName = xssSanitizer.sanitize(request.getName().trim());

        // 4. Trial abuse protection: Limit one trial per person
        Optional<Lead> existingLeadPhone = leadRepository.findByPhone(cleanPhone);
        if (existingLeadPhone.isPresent() && 
                (existingLeadPhone.get().getSource() == LeadSource.TRIAL || 
                 existingLeadPhone.get().getStatus() == LeadStatus.TRIAL_BOOKED)) {
            throw new BusinessValidationException(
                    "A complimentary trial session has already been registered for phone number: " + cleanPhone,
                    "TRIAL_LIMIT_EXCEEDED"
            );
        }

        if (cleanEmail != null) {
            Optional<Lead> existingLeadEmail = leadRepository.findByEmailIgnoreCase(cleanEmail);
            if (existingLeadEmail.isPresent() && 
                    (existingLeadEmail.get().getSource() == LeadSource.TRIAL || 
                     existingLeadEmail.get().getStatus() == LeadStatus.TRIAL_BOOKED)) {
                throw new BusinessValidationException(
                        "A complimentary trial session has already been registered for email: " + cleanEmail,
                        "TRIAL_LIMIT_EXCEEDED"
                );
            }
        }

        // 5. Verify court existence
        Court court = courtRepository.findById(request.getCourtId())
                .orElseThrow(() -> new ResourceNotFoundException("Court not found with id: " + request.getCourtId()));

        // 6. Check slot availability
        Instant startAt = request.getDate().atTime(request.getStartTime()).atZone(CLUB_ZONE).toInstant();
        Instant endAt = startAt.plusSeconds(3600); // 1-hour session

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                court.getId(),
                startAt,
                endAt,
                BookingStatus.CANCELLED
        );

        if (!conflicts.isEmpty()) {
            throw new DoubleBookingException(
                    "The selected court slot on " + court.getName() + " is no longer available. Please select another slot."
            );
        }

        // 7. Generate booking
        String bookingReference = "TR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Booking booking = Booking.builder()
                .bookingReference(bookingReference)
                .court(court)
                .guestName(cleanName)
                .guestPhone(cleanPhone)
                .startAt(startAt)
                .endAt(endAt)
                .status(BookingStatus.CONFIRMED)
                .source(BookingSource.ONLINE)
                .price(BigDecimal.ZERO)
                .paymentStatus(PaymentStatus.WAIVED)
                .planSnapshot("TRIAL_PASS")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        booking = bookingRepository.save(booking);

        // 8. Create or merge Lead
        String sportName = court.getSport() != null ? court.getSport().getName() : "General";
        Lead lead = existingLeadPhone.orElseGet(() -> {
            if (cleanEmail != null) {
                return leadRepository.findByEmailIgnoreCase(cleanEmail).orElse(null);
            }
            return null;
        });

        if (lead == null) {
            lead = Lead.builder()
                    .name(cleanName)
                    .email(cleanEmail)
                    .phone(cleanPhone)
                    .source(LeadSource.TRIAL)
                    .interest(sportName)
                    .message("Complimentary trial session booked for " + court.getName() + " on " + request.getDate() + " at " + request.getStartTime())
                    .status(LeadStatus.TRIAL_BOOKED)
                    .consent(request.getConsent() != null ? request.getConsent() : true)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
        } else {
            lead.setStatus(LeadStatus.TRIAL_BOOKED);
            lead.setInterest(sportName);
            lead.setUpdatedAt(Instant.now());
        }
        lead = leadRepository.save(lead);

        // 9. Add lead activity
        LeadActivity activity = LeadActivity.builder()
                .leadId(lead.getId())
                .type(LeadActivityType.SYSTEM)
                .details("Trial booking " + bookingReference + " reserved on " + court.getName() + 
                         " (" + request.getDate() + " " + request.getStartTime() + ").")
                .performerName("Website Booking Engine")
                .createdAt(Instant.now())
                .build();
        activityRepository.save(activity);

        return TrialBookingConfirmationDto.builder()
                .bookingReference(bookingReference)
                .courtName(court.getName())
                .sportName(sportName)
                .date(request.getDate())
                .startTime(request.getStartTime())
                .guestName(cleanName)
                .guestPhone(cleanPhone)
                .leadId(lead.getId())
                .message("Your complimentary trial pass is confirmed! Please arrive 15 minutes before your session.")
                .build();
    }

    @Transactional(readOnly = true)
    public List<PublicPlanDto> getPublicPlans() {
        List<PlanDto> plans = planService.getAllActivePlans();
        List<PublicPlanDto> result = new ArrayList<>();

        for (PlanDto plan : plans) {
            List<String> highlights = new ArrayList<>();
            boolean featured = "GOLD".equalsIgnoreCase(plan.getCode());

            if ("GOLD".equalsIgnoreCase(plan.getCode())) {
                highlights.add("14-Day Advance Booking Privilege");
                highlights.add("25% Discount on all Court Rentals");
                highlights.add("2 Complimentary Guest Passes / Month");
                highlights.add("Full Gym & Recovery Suite Access");
                highlights.add("Courtside Priority Tab Service");
            } else if ("SILVER".equalsIgnoreCase(plan.getCode())) {
                highlights.add("7-Day Advance Booking Window");
                highlights.add("Standard Member Court Rates");
                highlights.add("Friday Social Play Access");
                highlights.add("Member Lounge POS Tab");
            } else if ("JUNIOR".equalsIgnoreCase(plan.getCode())) {
                highlights.add("Under 18 Dedicated Coaching Clinics");
                highlights.add("Parent / Guardian Safety Profile");
                highlights.add("Safe Hours Access (Until 20:00 IST)");
                highlights.add("Youth Tournament Entry");
            } else {
                highlights.add(plan.getDurationMonths() + " Months Membership");
                highlights.add("Standard Facility Access");
            }

            result.add(PublicPlanDto.builder()
                    .code(plan.getCode())
                    .name(plan.getName())
                    .description(plan.getBenefits() != null && !plan.getBenefits().isEmpty() ? String.join(", ", plan.getBenefits()) : plan.getName() + " Tier")
                    .price(plan.getPrice())
                    .billingCycle("MONTHLY")
                    .durationMonths(plan.getDurationMonths())
                    .bookingAdvanceDays("GOLD".equalsIgnoreCase(plan.getCode()) ? 14 : 7)
                    .discountPercent("GOLD".equalsIgnoreCase(plan.getCode()) ? 25 : 0)
                    .guestPassesPerMonth("GOLD".equalsIgnoreCase(plan.getCode()) ? 2 : 0)
                    .gymAccess("GOLD".equalsIgnoreCase(plan.getCode()))
                    .highlights(highlights)
                    .featured(featured)
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<PublicPriceDto> getPublicPrices() {
        List<PublicPriceDto> prices = new ArrayList<>();
        prices.add(PublicPriceDto.builder()
                .sportName("Badminton")
                .surfaceType("BWF Grade-1 Taraflex Hardwood")
                .memberHourlyRate(BigDecimal.valueOf(18.00))
                .guestHourlyRate(BigDecimal.valueOf(28.00))
                .peakSurgeRate(BigDecimal.valueOf(5.00))
                .trialSessionFee(BigDecimal.ZERO)
                .courtNames(List.of("Courts 1-8"))
                .build());
        prices.add(PublicPriceDto.builder()
                .sportName("Tennis")
                .surfaceType("US Open Acrylic Hardcourt")
                .memberHourlyRate(BigDecimal.valueOf(32.00))
                .guestHourlyRate(BigDecimal.valueOf(48.00))
                .peakSurgeRate(BigDecimal.valueOf(10.00))
                .trialSessionFee(BigDecimal.ZERO)
                .courtNames(List.of("Courts 1-4 (Indoor)"))
                .build());
        prices.add(PublicPriceDto.builder()
                .sportName("Squash")
                .surfaceType("WSF Certified Glass Back")
                .memberHourlyRate(BigDecimal.valueOf(22.00))
                .guestHourlyRate(BigDecimal.valueOf(34.00))
                .peakSurgeRate(BigDecimal.valueOf(6.00))
                .trialSessionFee(BigDecimal.ZERO)
                .courtNames(List.of("Courts 1-4"))
                .build());
        prices.add(PublicPriceDto.builder()
                .sportName("Pickleball")
                .surfaceType("Cushioned Polyurethane")
                .memberHourlyRate(BigDecimal.valueOf(16.00))
                .guestHourlyRate(BigDecimal.valueOf(24.00))
                .peakSurgeRate(BigDecimal.valueOf(4.00))
                .trialSessionFee(BigDecimal.ZERO)
                .courtNames(List.of("Courts 1-6"))
                .build());
        return prices;
    }

    @Transactional(readOnly = true)
    public AvailabilityResponse getPublicAvailability(LocalDate date, UUID sportId) {
        LocalDate queryDate = date != null ? date : LocalDate.now(CLUB_ZONE);
        AvailabilityResponse raw = availabilityService.getAvailability(queryDate, sportId, null, null);

        // Strip private data (holds, bookings, user identities) to ensure zero data leakage
        if (raw.getCourts() != null) {
            for (CourtAvailabilityDto court : raw.getCourts()) {
                if (court.getSlots() != null) {
                    for (AvailabilitySlotDto slot : court.getSlots()) {
                        slot.setHoldId(null);
                        slot.setBookingId(null);
                        if (!"AVAILABLE".equals(slot.getState() != null ? slot.getState().name() : "")) {
                            slot.setReason("Unavailable");
                        }
                    }
                }
            }
        }
        return raw;
    }

    @Transactional(readOnly = true)
    public List<PublicCatalogItemDto> getPublicShopCatalog() {
        List<Product> products = productRepository.findAllActive();
        List<PublicCatalogItemDto> result = new ArrayList<>();

        for (Product p : products) {
            String img = (p.getImages() != null && p.getImages().length > 0) ? p.getImages()[0] : null;
            result.add(PublicCatalogItemDto.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .brand(p.getBrand())
                    .category(p.getCategory() != null ? p.getCategory().getName() : "Pro Equipment")
                    .description(p.getDescription())
                    .retailPrice(p.getBasePrice()) // Selling price only, never cost price
                    .currency("INR")
                    .stockStatus("IN_STOCK")
                    .imageUrl(img)
                    .build());
        }
        return result;
    }

    @Transactional
    public Member360Dto purchaseMembershipOnline(OnlineMembershipPurchaseRequest request, String clientIp) {
        // 1. Rate limiting
        if (!rateLimiter.tryAcquire(clientIp)) {
            throw new BusinessValidationException(
                    "Too many requests from your connection. Please wait a minute and try again.",
                    "RATE_LIMIT_EXCEEDED"
            );
        }

        // 2. Honeypot check
        if (request.getWebsite_hp() != null && !request.getWebsite_hp().isBlank()) {
            log.warn("Spam honeypot triggered on membership purchase by IP: {}", clientIp);
            throw new BusinessValidationException("Invalid registration request.", "SPAM_DETECTED");
        }

        // 3. Duplicate check against existing active members
        String cleanEmail = request.getEmail().trim().toLowerCase();
        String cleanPhone = request.getPhone().trim();

        if (memberRepository.findByEmailAndIsDeletedFalse(cleanEmail).isPresent()) {
            throw new BusinessValidationException(
                    "An active club member with this email address already exists. Please login to your member portal.",
                    "DUPLICATE_MEMBER_EMAIL"
            );
        }
        if (memberRepository.findByPhoneAndIsDeletedFalse(cleanPhone).isPresent()) {
            throw new BusinessValidationException(
                    "An active club member with this phone number already exists. Please login to your member portal.",
                    "DUPLICATE_MEMBER_PHONE"
            );
        }

        // 4. Register member
        RegisterMemberRequest regReq = RegisterMemberRequest.builder()
                .fullName(xssSanitizer.sanitize(request.getName().trim()))
                .email(cleanEmail)
                .phone(cleanPhone)
                .dob(request.getDob())
                .planCode(request.getPlanCode().toUpperCase().trim())
                .address(request.getAddress())
                .emergencyContact(request.getEmergencyContact())
                .createPortalAccount(true)
                .portalPassword("Champions@" + (1000 + (int)(Math.random() * 9000)))
                .build();

        Member360Dto newMember = memberService.registerMember(regReq, "online-self-serve");

        // 5. Welcome flow
        try {
            if (newMember.getProfile().getUserId() != null) {
                User memberUser = userRepository.findById(newMember.getProfile().getUserId()).orElse(null);
                if (memberUser != null) {
                    notificationDispatcher.dispatch(
                            memberUser,
                            null,
                            "Welcome to Champions Club!",
                            "Congratulations " + newMember.getProfile().getFullName() + "! Your online membership (" + newMember.getProfile().getMemberNo() + ") is active. Use code WELCOME100 for your first-week court pass.",
                            NotificationType.ACCOUNT,
                            "{\"voucher\":\"WELCOME100\",\"offer\":\"First-week court pass & smoothie voucher\"}"
                    );
                }
            }
        } catch (Exception ex) {
            log.warn("Online welcome notification failed: {}", ex.getMessage());
        }

        return newMember;
    }
}
