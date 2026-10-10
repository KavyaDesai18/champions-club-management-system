package com.championsclub.common.seed;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.repo.*;
import com.championsclub.common.security.Role;
import com.championsclub.court.domain.*;
import com.championsclub.court.repo.*;
import com.championsclub.crm.domain.*;
import com.championsclub.crm.repo.*;
import com.championsclub.hr.domain.*;
import com.championsclub.hr.repo.*;
import com.championsclub.member.domain.*;
import com.championsclub.member.repo.*;
import com.championsclub.reporting.domain.Expense;
import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.repo.ExpenseRepository;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.repo.*;
import com.championsclub.social.domain.*;
import com.championsclub.social.repo.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Component
public class RealisticDemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(RealisticDemoDataSeeder.class);

    private final MemberRepository memberRepository;
    private final PlanRepository planRepository;
    private final UserRepository userRepository;
    private final GuardianRepository guardianRepository;
    private final CourtRepository courtRepository;
    private final SportRepository sportRepository;
    private final BookingRepository bookingRepository;
    private final SocialSessionRepository socialSessionRepository;
    private final SocialParticipantRepository socialParticipantRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final LowStockAlertRepository lowStockAlertRepository;
    private final ClubServiceRepository clubServiceRepository;
    private final ServiceJobTicketRepository serviceJobTicketRepository;
    private final MenuCategoryRepository menuCategoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final BarTableRepository barTableRepository;
    private final TabRepository tabRepository;
    private final TabItemRepository tabItemRepository;
    private final KitchenTicketRepository kitchenTicketRepository;
    private final LeadRepository leadRepository;
    private final EmployeeRepository employeeRepository;
    private final RosterShiftRepository rosterShiftRepository;
    private final PayrollRunRepository payrollRunRepository;
    private final PayslipRepository payslipRepository;
    private final ExpenseRepository expenseRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.demo:false}")
    private boolean seedDemoOnStartup;

    public RealisticDemoDataSeeder(
            MemberRepository memberRepository,
            PlanRepository planRepository,
            UserRepository userRepository,
            GuardianRepository guardianRepository,
            CourtRepository courtRepository,
            SportRepository sportRepository,
            BookingRepository bookingRepository,
            SocialSessionRepository socialSessionRepository,
            SocialParticipantRepository socialParticipantRepository,
            ProductCategoryRepository productCategoryRepository,
            ProductRepository productRepository,
            ProductVariantRepository productVariantRepository,
            LowStockAlertRepository lowStockAlertRepository,
            ClubServiceRepository clubServiceRepository,
            ServiceJobTicketRepository serviceJobTicketRepository,
            MenuCategoryRepository menuCategoryRepository,
            MenuItemRepository menuItemRepository,
            BarTableRepository barTableRepository,
            TabRepository tabRepository,
            TabItemRepository tabItemRepository,
            KitchenTicketRepository kitchenTicketRepository,
            LeadRepository leadRepository,
            EmployeeRepository employeeRepository,
            RosterShiftRepository rosterShiftRepository,
            PayrollRunRepository payrollRunRepository,
            PayslipRepository payslipRepository,
            ExpenseRepository expenseRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.memberRepository = memberRepository;
        this.planRepository = planRepository;
        this.userRepository = userRepository;
        this.guardianRepository = guardianRepository;
        this.courtRepository = courtRepository;
        this.sportRepository = sportRepository;
        this.bookingRepository = bookingRepository;
        this.socialSessionRepository = socialSessionRepository;
        this.socialParticipantRepository = socialParticipantRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.lowStockAlertRepository = lowStockAlertRepository;
        this.clubServiceRepository = clubServiceRepository;
        this.serviceJobTicketRepository = serviceJobTicketRepository;
        this.menuCategoryRepository = menuCategoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.barTableRepository = barTableRepository;
        this.tabRepository = tabRepository;
        this.tabItemRepository = tabItemRepository;
        this.kitchenTicketRepository = kitchenTicketRepository;
        this.leadRepository = leadRepository;
        this.employeeRepository = employeeRepository;
        this.rosterShiftRepository = rosterShiftRepository;
        this.payrollRunRepository = payrollRunRepository;
        this.payslipRepository = payslipRepository;
        this.expenseRepository = expenseRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        boolean requestedByCli = false;
        if (args != null) {
            for (String arg : args) {
                if ("--seed-demo".equalsIgnoreCase(arg) || "--app.seed.demo=true".equalsIgnoreCase(arg)) {
                    requestedByCli = true;
                    break;
                }
            }
        }

        if (seedDemoOnStartup || requestedByCli) {
            log.info("Triggering automatic Realistic Demo Data Seeding on startup...");
            seedAllDemoData(false);
        }
    }

    @Transactional
    public Map<String, Object> seedAllDemoData(boolean force) {
        log.info("Starting Realistic Demo Data Seeding (force={})...", force);
        Map<String, Object> summary = new LinkedHashMap<>();

        // 1. Ensure Plans
        Plan goldPlan = planRepository.findByCode("GOLD").orElseGet(() ->
                planRepository.save(Plan.builder()
                        .code("GOLD").name("Gold Tier VIP").price(new BigDecimal("2999.00"))
                        .durationMonths(12).courtDiscountPct(new BigDecimal("25.00"))
                        .shopDiscountPct(new BigDecimal("20.00")).barDiscountPct(new BigDecimal("15.00"))
                        .advanceBookingDays(14).maxBookingsPerDay(2).active(true).build()));

        Plan silverPlan = planRepository.findByCode("SILVER").orElseGet(() ->
                planRepository.save(Plan.builder()
                        .code("SILVER").name("Silver Tier Standard").price(new BigDecimal("1499.00"))
                        .durationMonths(12).courtDiscountPct(new BigDecimal("10.00"))
                        .shopDiscountPct(new BigDecimal("10.00")).barDiscountPct(new BigDecimal("5.00"))
                        .advanceBookingDays(7).maxBookingsPerDay(2).active(true).build()));

        Plan juniorPlan = planRepository.findByCode("JUNIOR").orElseGet(() ->
                planRepository.save(Plan.builder()
                        .code("JUNIOR").name("Junior Cadet (Under 18)").price(new BigDecimal("999.00"))
                        .durationMonths(12).courtDiscountPct(new BigDecimal("30.00"))
                        .shopDiscountPct(new BigDecimal("15.00")).barDiscountPct(BigDecimal.ZERO)
                        .advanceBookingDays(7).maxBookingsPerDay(2).active(true).build()));

        summary.put("plans", List.of("GOLD", "SILVER", "JUNIOR"));

        // 2. Ensure Sports and Courts
        Sport badminton = sportRepository.findByNameIgnoreCaseAndIsDeletedFalse("Badminton").orElseGet(() ->
                sportRepository.save(Sport.builder().name("Badminton").defaultSessionMinutes(60).isActive(true).build()));
        Sport tennis = sportRepository.findByNameIgnoreCaseAndIsDeletedFalse("Tennis").orElseGet(() ->
                sportRepository.save(Sport.builder().name("Tennis").defaultSessionMinutes(60).isActive(true).build()));
        Sport squash = sportRepository.findByNameIgnoreCaseAndIsDeletedFalse("Squash").orElseGet(() ->
                sportRepository.save(Sport.builder().name("Squash").defaultSessionMinutes(60).isActive(true).build()));
        Sport pickleball = sportRepository.findByNameIgnoreCaseAndIsDeletedFalse("Pickleball").orElseGet(() ->
                sportRepository.save(Sport.builder().name("Pickleball").defaultSessionMinutes(60).isActive(true).build()));

        List<Court> courts = courtRepository.findAll();
        if (courts.isEmpty()) {
            courts = List.of(
                    courtRepository.save(Court.builder().name("Badminton Court 1").sport(badminton).sportType(SportType.BADMINTON).surface("SYNTHETIC").indoor(true).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("15.00")).hourlyRateGuest(new BigDecimal("20.00")).isActive(true).build()),
                    courtRepository.save(Court.builder().name("Badminton Court 2").sport(badminton).sportType(SportType.BADMINTON).surface("SYNTHETIC").indoor(true).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("15.00")).hourlyRateGuest(new BigDecimal("20.00")).isActive(true).build()),
                    courtRepository.save(Court.builder().name("Badminton Court 3").sport(badminton).sportType(SportType.BADMINTON).surface("WOODEN").indoor(true).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("18.00")).hourlyRateGuest(new BigDecimal("24.00")).isActive(true).build()),
                    courtRepository.save(Court.builder().name("Tennis Court 1 (Hard)").sport(tennis).sportType(SportType.TENNIS).surface("ACRYLIC_HARD").indoor(false).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("25.00")).hourlyRateGuest(new BigDecimal("35.00")).isActive(true).build()),
                    courtRepository.save(Court.builder().name("Tennis Court 2 (Clay)").sport(tennis).sportType(SportType.TENNIS).surface("CLAY").indoor(false).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("30.00")).hourlyRateGuest(new BigDecimal("40.00")).isActive(true).build()),
                    courtRepository.save(Court.builder().name("Squash Court 1").sport(squash).sportType(SportType.SQUASH).surface("GLASS_BACK").indoor(true).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("20.00")).hourlyRateGuest(new BigDecimal("28.00")).isActive(true).build()),
                    courtRepository.save(Court.builder().name("Pickleball Court 1").sport(pickleball).sportType(SportType.BADMINTON).surface("SYNTHETIC").indoor(true).status(CourtStatus.ACTIVE).hourlyRateMember(new BigDecimal("12.00")).hourlyRateGuest(new BigDecimal("18.00")).isActive(true).build())
            );
        }
        summary.put("courtsCount", courts.size());

        // 3. Seed 60 Members with Users & Guardians
        long currentMemberCount = memberRepository.count();
        List<Member> seededMembers = new ArrayList<>();
        String defaultHashedPassword = passwordEncoder.encode("Champions@123");
        LocalDate today = LocalDate.now();

        String[] sampleNames = {
                "Sania Mirza", "Rohan Bopanna", "Leander Paes", "Mahesh Bhupathi", "P.V. Sindhu",
                "Kidambi Srikanth", "Saina Nehwal", "Chirag Shetty", "Satwiksairaj Rankireddy", "Ashwini Ponnappa",
                "Jwala Gutta", "Lakshya Sen", "H.S. Prannoy", "Saurav Ghosal", "Joshna Chinappa",
                "Dipika Pallikal", "Vikram Rathore", "Sunil Chhetri", "Virat Kohli", "Rahul Dravid",
                "Sachin Tendulkar", "Mary Kom", "Neeraj Chopra", "Abhinav Bindra", "Viswanathan Anand",
                "Ananya Birla", "Aditya Roy", "Pooja Hegde", "Kabir Bedi", "Rhea Pillai",
                "Arjun Rampal", "Tara Sutaria", "Dev Patel", "Kriti Sanon", "Farhan Akhtar",
                "Zoya Akhtar", "Ishaan Khatter", "Mira Rajput", "Karan Johar", "Shibani Dandekar",
                "Ranveer Singh", "Deepika Padukone", "Sid Malhotra", "Kiara Advani", "Alia Bhatt",
                "Varun Dhawan", "Sara Ali Khan", "Kartik Aaryan", "Anushka Sharma", "Hardik Pandya",
                "Aryan Cadet", "Vihaan Cadet", "Rhea Cadet", "Kabir Cadet", "Anaya Cadet",
                "Reyansh Cadet", "Isha Cadet", "Samar Cadet", "Aarav Cadet", "Diya Cadet"
        };

        if (currentMemberCount < 60 || force) {
            for (int i = 0; i < sampleNames.length; i++) {
                String name = sampleNames[i];
                String email = name.toLowerCase().replace(" ", ".").replace("'", "") + "@championsclub.demo";
                String phone = "+9198000" + String.format("%05d", (i + 1));
                String memberNo = String.format("CC-%06d", (i + 1));

                boolean isJunior = i >= 50; // Last 10 are junior cadets
                Plan plan = isJunior ? juniorPlan : (i % 2 == 0 ? goldPlan : silverPlan);

                MemberStatus status = MemberStatus.ACTIVE;
                LocalDate startDate = today.minusMonths(i % 10 + 1);
                LocalDate endDate = startDate.plusYears(1);

                // Expiry reminder demo: Members 45 to 49 expire within next 7 days!
                if (i >= 45 && i < 50) {
                    status = MemberStatus.ACTIVE;
                    endDate = today.plusDays((i - 45) + 2); // expires in 2 to 6 days
                } else if (i == 43 || i == 44) {
                    status = MemberStatus.EXPIRED;
                    endDate = today.minusDays(10);
                }

                Optional<Member> existing = memberRepository.findByEmailAndIsDeletedFalse(email);
                Member member;
                if (existing.isPresent()) {
                    member = existing.get();
                } else {
                    User user = userRepository.findByEmailAndIsDeletedFalse(email).orElseGet(() ->
                            userRepository.save(User.builder()
                                    .email(email)
                                    .fullName(name)
                                    .phone(phone)
                                    .passwordHash(defaultHashedPassword)
                                    .role(Role.MEMBER)
                                    .status("ACTIVE")
                                    .failedAttempts(0)
                                    .tokenVersion(1)
                                    .createdAt(Instant.now())
                                    .updatedAt(Instant.now())
                                    .isDeleted(false)
                                    .build()));

                    LocalDate dob = isJunior ? today.minusYears(12 + (i % 5)) : today.minusYears(24 + (i % 20));

                    member = Member.builder()
                            .memberNo(memberNo)
                            .fullName(name)
                            .email(email)
                            .phone(phone)
                            .dob(dob)
                            .gender((i % 2 == 0) ? "FEMALE" : "MALE")
                            .address("Bangalore Sports Enclave, Sector " + (i % 5 + 1))
                            .status(status)
                            .plan(plan)
                            .user(user)
                            .startDate(startDate)
                            .endDate(endDate)
                            .walletBalance(new BigDecimal((100 * (i % 20 + 2)) + ".00"))
                            .guestPassesRemaining(plan.getCode().equals("GOLD") ? 2 : 1)
                            .createdAt(Instant.now().minus(Duration.ofDays(60)))
                            .updatedAt(Instant.now())
                            .isDeleted(false)
                            .build();

                    member = memberRepository.save(member);

                    if (isJunior) {
                        guardianRepository.save(Guardian.builder()
                                .member(member)
                                .name("Guardian of " + name)
                                .phone("+9197000" + String.format("%05d", (i + 1)))
                                .relation("Parent")
                                .consentAt(Instant.now().minus(Duration.ofDays(30)))
                                .createdAt(Instant.now())
                                .build());
                    }
                }
                seededMembers.add(member);
            }
        } else {
            seededMembers = memberRepository.findAll();
        }
        summary.put("membersCount", seededMembers.size());

        // 4. Seed 3 Weeks of Bookings across courts
        if (bookingRepository.count() < 20 || force) {
            Court mainCourt = courts.get(0);
            Court tennisCourt = courts.size() > 3 ? courts.get(3) : mainCourt;

            for (int dayOffset = -7; dayOffset <= 14; dayOffset++) {
                LocalDate bookDate = today.plusDays(dayOffset);
                Member bookingMember = seededMembers.get(Math.abs(dayOffset) % seededMembers.size());

                Instant start18 = bookDate.atTime(18, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
                Instant end19 = bookDate.atTime(19, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();

                BookingStatus bStatus = dayOffset < 0 ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED;

                try {
                    bookingRepository.save(Booking.builder()
                            .bookingReference("BK-" + bookDate.toString().replace("-", "") + "-" + (dayOffset + 10))
                            .court(mainCourt)
                            .member(bookingMember)
                            .user(bookingMember.getUser())
                            .startAt(start18)
                            .endAt(end19)
                            .price(new BigDecimal("15.00"))
                            .status(bStatus)
                            .paymentStatus(PaymentStatus.PAID)
                            .source(BookingSource.ONLINE)
                            .planSnapshot(bookingMember.getPlan() != null ? bookingMember.getPlan().getCode() : "SILVER")
                            .build());
                } catch (Exception ignored) {
                    // Overlap guard is working
                }

                // Tennis afternoon session
                Instant start16 = bookDate.atTime(16, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
                Instant end17 = bookDate.atTime(17, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
                Member tennisMember = seededMembers.get((Math.abs(dayOffset) + 5) % seededMembers.size());
                try {
                    bookingRepository.save(Booking.builder()
                            .bookingReference("BK-TN-" + bookDate.toString().replace("-", "") + "-" + (dayOffset + 10))
                            .court(tennisCourt)
                            .member(tennisMember)
                            .user(tennisMember.getUser())
                            .startAt(start16)
                            .endAt(end17)
                            .price(new BigDecimal("25.00"))
                            .status(bStatus)
                            .paymentStatus(PaymentStatus.PAID)
                            .source(BookingSource.ONLINE)
                            .planSnapshot(tennisMember.getPlan() != null ? tennisMember.getPlan().getCode() : "GOLD")
                            .build());
                } catch (Exception ignored) {}
            }
        }
        summary.put("bookingsCount", bookingRepository.count());

        // 5. Seed Friday Social Sessions
        if (socialSessionRepository.count() == 0 || force) {
            LocalDate thisFriday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.FRIDAY));
            Court badmintonCourt = courts.get(0);

            for (int fridayOffset : List.of(-14, -7, 0, 7)) {
                LocalDate fDate = thisFriday.plusDays(fridayOffset);
                Instant fStart = fDate.atTime(18, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
                Instant fEnd = fDate.atTime(21, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
                SocialSessionStatus sStatus = fridayOffset < 0 ? SocialSessionStatus.COMPLETED : SocialSessionStatus.SCHEDULED;

                SocialSession session = socialSessionRepository.save(SocialSession.builder()
                        .court(badmintonCourt)
                        .sport(badminton)
                        .title("Friday Night Badminton Mixer (" + fDate + ")")
                        .description("Weekly round-robin social doubles play with club lounge drinks afterwards.")
                        .startAt(fStart)
                        .endAt(fEnd)
                        .capacity(16)
                        .minParticipants(6)
                        .feeMember(BigDecimal.ZERO)
                        .feeGuest(new BigDecimal("15.00"))
                        .status(sStatus)
                        .allowJuniors(true)
                        .countsTowardDailyQuota(false)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build());

                // Seed participants
                for (int p = 0; p < 12; p++) {
                    Member partMem = seededMembers.get(p % seededMembers.size());
                    socialParticipantRepository.save(SocialParticipant.builder()
                            .session(session)
                            .member(partMem)
                            .status(SocialParticipantStatus.JOINED)
                            .paymentStatus(SocialPaymentStatus.PAID)
                            .feePaid(BigDecimal.ZERO)
                            .attendanceStatus(fridayOffset < 0 ? com.championsclub.social.domain.AttendanceStatus.ATTENDED : com.championsclub.social.domain.AttendanceStatus.PENDING)
                            .joinedAt(Instant.now().minus(Duration.ofDays(2)))
                            .build());
                }
            }
        }
        summary.put("socialSessionsCount", socialSessionRepository.count());

        // 6. Seed Shop Products with Variants and Low-Stock Alert
        ProductCategory racketCat = productCategoryRepository.findByCode("RACKETS").orElseGet(() ->
                productCategoryRepository.save(ProductCategory.builder().code("RACKETS").name("Rackets").description("Pro rackets").displayOrder(1).build()));
        ProductCategory shoeCat = productCategoryRepository.findByCode("SHOES").orElseGet(() ->
                productCategoryRepository.save(ProductCategory.builder().code("SHOES").name("Shoes").description("Court shoes").displayOrder(2).build()));
        ProductCategory ballCat = productCategoryRepository.findByCode("BALLS").orElseGet(() ->
                productCategoryRepository.save(ProductCategory.builder().code("BALLS").name("Balls").description("Shuttlecocks and balls").displayOrder(3).build()));

        Product racket = productRepository.findBySkuAndIsDeletedFalse("RK-ASTROX99").orElseGet(() ->
                productRepository.save(Product.builder()
                        .sku("RK-ASTROX99").name("Yonex Astrox 99 Pro Badminton Racket")
                        .category(racketCat).brand("Yonex").basePrice(new BigDecimal("18999.00"))
                        .active(true).isDeleted(false).build()));

        Product shoes = productRepository.findBySkuAndIsDeletedFalse("SH-GELROCKET").orElseGet(() ->
                productRepository.save(Product.builder()
                        .sku("SH-GELROCKET").name("Asics Gel-Rocket 10 Court Shoes")
                        .category(shoeCat).brand("Asics").basePrice(new BigDecimal("6499.00"))
                        .active(true).isDeleted(false).build()));

        Product shuttles = productRepository.findBySkuAndIsDeletedFalse("BL-AERO50").orElseGet(() ->
                productRepository.save(Product.builder()
                        .sku("BL-AERO50").name("Yonex Aerosensa 50 Feather Shuttles")
                        .category(ballCat).brand("Yonex").basePrice(new BigDecimal("2899.00"))
                        .active(true).isDeleted(false).build()));

        ProductVariant shoeVariantLow = productVariantRepository.findBySkuAndIsDeletedFalse("SH-GELROCKET-10").orElseGet(() ->
                productVariantRepository.save(ProductVariant.builder()
                        .product(shoes).sku("SH-GELROCKET-10").size("UK 10").color("White/Cyan")
                        .costPrice(new BigDecimal("4200.00")).reorderLevel(5).reorderQty(20).build()));

        // Active Low Stock Alert
        if (lowStockAlertRepository.count() == 0 || force) {
            lowStockAlertRepository.save(LowStockAlert.builder()
                    .variant(shoeVariantLow)
                    .currentAvailable(2)
                    .reorderLevel(5)
                    .reorderQty(20)
                    .status(LowStockAlertStatus.ACTIVE)
                    .build());
        }

        // Stringing Service Ticket
        if (serviceJobTicketRepository.count() == 0 || force) {
            Member client = seededMembers.get(0);
            ClubService stringingService = clubServiceRepository.findByCode("SRV-STR-01").orElseGet(() ->
                    clubServiceRepository.save(ClubService.builder()
                            .code("SRV-STR-01").name("Racket Stringing & Tensioning")
                            .serviceType(ServiceType.STRINGING).basePrice(new BigDecimal("450.00"))
                            .description("Professional tournament restringing").active(true).build()));

            serviceJobTicketRepository.save(ServiceJobTicket.builder()
                    .ticketNumber("TK-STR-1001")
                    .service(stringingService)
                    .member(client)
                    .stringType("Yonex BG 65 Ti")
                    .tensionLbs(new BigDecimal("27.0"))
                    .turnaroundType("STANDARD_3_DAYS")
                    .totalPrice(new BigDecimal("450.00"))
                    .status(JobTicketStatus.IN_PROGRESS)
                    .notes("Tournament stringing request: 27 lbs tension, white string.")
                    .build());
        }
        summary.put("productsCount", productRepository.count());

        // 7. Seed Bar Tables & Tabs
        BarTable table1 = barTableRepository.findByLabel("Table 1").orElseGet(() ->
                barTableRepository.save(BarTable.builder().label("Table 1").seats(4).status(TableStatus.OCCUPIED).build()));
        BarTable table2 = barTableRepository.findByLabel("Table 2").orElseGet(() ->
                barTableRepository.save(BarTable.builder().label("Table 2").seats(4).status(TableStatus.OCCUPIED).build()));

        MenuCategory beverageCat = menuCategoryRepository.findByCode("BEVERAGES").orElseGet(() ->
                menuCategoryRepository.save(MenuCategory.builder().name("Beverages").code("BEVERAGES").displayOrder(1).isActive(true).build()));

        MenuItem proteinShake = menuItemRepository.findAllByIsDeletedFalseOrderByCategoryDisplayOrderAscNameAsc().stream()
                .filter(i -> i.getName().equalsIgnoreCase("Whey Protein Recovery Shake"))
                .findFirst()
                .orElseGet(() -> menuItemRepository.save(MenuItem.builder()
                        .name("Whey Protein Recovery Shake").category(beverageCat).price(new BigDecimal("220.00"))
                        .prepStation(StationType.BAR).isAvailable(true).isAlcoholic(false).build()));

        MenuItem limeSoda = menuItemRepository.findAllByIsDeletedFalseOrderByCategoryDisplayOrderAscNameAsc().stream()
                .filter(i -> i.getName().equalsIgnoreCase("Fresh Lime Soda (Mint)"))
                .findFirst()
                .orElseGet(() -> menuItemRepository.save(MenuItem.builder()
                        .name("Fresh Lime Soda (Mint)").category(beverageCat).price(new BigDecimal("90.00"))
                        .prepStation(StationType.BAR).isAvailable(true).isAlcoholic(false).build()));

        if (tabRepository.count() == 0 || force) {
            User staffUser = userRepository.findByEmailAndIsDeletedFalse("owner@championsclub.com").orElse(seededMembers.get(0).getUser());
            Tab openTab = tabRepository.save(Tab.builder()
                    .tabNumber("TAB-1001")
                    .table(table1)
                    .member(seededMembers.get(0))
                    .openedBy(staffUser)
                    .status(TabStatus.OPEN)
                    .subtotal(new BigDecimal("310.00"))
                    .taxAmount(new BigDecimal("15.50"))
                    .totalAmount(new BigDecimal("325.50"))
                    .build());

            tabItemRepository.save(TabItem.builder()
                    .tab(openTab).menuItem(proteinShake).itemName(proteinShake.getName())
                    .qty(1).unitPrice(proteinShake.getPrice()).lineTotal(proteinShake.getPrice())
                    .station(StationType.BAR).status(TabItemStatus.PREPARING).build());

            tabItemRepository.save(TabItem.builder()
                    .tab(openTab).menuItem(limeSoda).itemName(limeSoda.getName())
                    .qty(1).unitPrice(limeSoda.getPrice()).lineTotal(limeSoda.getPrice())
                    .station(StationType.BAR).status(TabItemStatus.READY).build());
        }
        summary.put("barTabsCount", tabRepository.count());

        // 8. Seed Leads (CRM)
        if (leadRepository.count() == 0 || force) {
            List<Lead> leads = List.of(
                    Lead.builder().name("Infosys Sports Club").email("sports@infosys.demo").phone("+919876001122").source(LeadSource.CORPORATE).interest("Annual Badminton Tournament").status(LeadStatus.QUOTE_SENT).message("Requesting quote for 40 participants across 6 courts.").consent(true).build(),
                    Lead.builder().name("Vikramaditya Rao").email("vikram@rao.demo").phone("+919876003344").source(LeadSource.WEB_FORM).interest("Junior Academy Trial").status(LeadStatus.TRIAL_BOOKED).message("Son is 11 years old, interested in professional badminton training.").consent(true).build(),
                    Lead.builder().name("Wipro Badminton Team").email("badminton@wipro.demo").phone("+919876005566").source(LeadSource.CORPORATE).interest("Corporate Membership Slabs").status(LeadStatus.CONTACTED).message("Looking for 25 employee subsidized memberships.").consent(true).build(),
                    Lead.builder().name("Natasha Fernandez").email("natasha@demo.com").phone("+919876007788").source(LeadSource.TRIAL).interest("Tennis Coaching").status(LeadStatus.NEW).message("Interested in private morning tennis coaching.").consent(true).build(),
                    Lead.builder().name("Gaurav Kapoor").email("gaurav@kapoor.demo").phone("+919876009900").source(LeadSource.WALK_IN).interest("Gold VIP Membership").status(LeadStatus.WON).message("Signed up after Saturday court tour.").consent(true).build()
            );
            leadRepository.saveAll(leads);
        }
        summary.put("leadsCount", leadRepository.count());

        // 9. Seed Employees & Staff Roster
        if (employeeRepository.count() == 0 || force) {
            String[] empNames = {"Alice Frontdesk", "Bob Bartender", "Gordon Chef", "Mike Stringer", "Maya Manager", "Prakash Coach"};
            String[] departments = {"OPERATIONS", "F_AND_B", "F_AND_B", "OPERATIONS", "ADMINISTRATION", "COACHING"};
            String[] designations = {"Front Desk Lead", "Head Mixologist", "Executive Chef", "Pro Shop Specialist", "Club General Manager", "Head Tennis Coach"};
            Role[] roles = {Role.FRONT_DESK, Role.BAR_STAFF, Role.KITCHEN, Role.SHOP_STAFF, Role.MANAGER, Role.COACH};

            for (int e = 0; e < empNames.length; e++) {
                String eName = empNames[e];
                String eEmail = eName.toLowerCase().replace(" ", ".") + "@championsclub.com";
                String ePhone = "+9199000" + String.format("%05d", (e + 1));
                String empNo = String.format("EMP-%04d", (e + 1001));

                User empUser = userRepository.findByEmailAndIsDeletedFalse(eEmail).orElseGet(() ->
                        userRepository.save(User.builder()
                                .email(eEmail).fullName(eName).phone(ePhone)
                                .passwordHash(defaultHashedPassword).role(roles[e]).status("ACTIVE")
                                .failedAttempts(0).tokenVersion(1).createdAt(Instant.now()).updatedAt(Instant.now())
                                .isDeleted(false).build()));

                Employee employee = employeeRepository.save(Employee.builder()
                        .user(empUser).empNo(empNo).designation(designations[e]).department(departments[e])
                        .joinDate(today.minusMonths(12)).salaryType(SalaryType.MONTHLY)
                        .baseSalary(new BigDecimal("45000.00")).bankName("HDFC Bank").bankAccountMasked("••••••••4321")
                        .status(EmployeeStatus.ACTIVE).createdAt(Instant.now()).updatedAt(Instant.now())
                        .isDeleted(false).build());

                // Roster shift for today
                rosterShiftRepository.save(RosterShift.builder()
                        .employee(employee).shiftDate(today)
                        .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(16, 0))
                        .department(departments[e]).station(departments[e]).role(roles[e].name())
                        .isPublished(true).build());
            }

            // Seed 1 Completed Payroll Run for last month
            LocalDate lastMonthDate = today.minusMonths(1);
            PayrollRun payrollRun = payrollRunRepository.save(PayrollRun.builder()
                    .runNumber("PR-" + lastMonthDate.getYear() + "-" + String.format("%02d", lastMonthDate.getMonthValue()))
                    .year(lastMonthDate.getYear()).month(lastMonthDate.getMonthValue())
                    .status(PayrollRunStatus.APPROVED)
                    .totalGross(new BigDecimal("270000.00"))
                    .totalDeductions(new BigDecimal("27000.00"))
                    .totalNet(new BigDecimal("243000.00"))
                    .createdAt(Instant.now().minus(Duration.ofDays(10)))
                    .updatedAt(Instant.now())
                    .build());

            List<Employee> allEmployees = employeeRepository.findAll();
            for (Employee emp : allEmployees) {
                payslipRepository.save(Payslip.builder()
                        .payrollRun(payrollRun).employee(emp)
                        .payslipNumber("PS-" + lastMonthDate.getYear() + "-" + emp.getEmpNo())
                        .year(lastMonthDate.getYear()).month(lastMonthDate.getMonthValue())
                        .baseSalary(emp.getBaseSalary()).workingDaysInMonth(26).daysWorked(new BigDecimal("26"))
                        .grossPay(emp.getBaseSalary())
                        .totalDeductions(emp.getBaseSalary().multiply(new BigDecimal("0.10")))
                        .netPay(emp.getBaseSalary().multiply(new BigDecimal("0.90")))
                        .status(PayslipStatus.PAID)
                        .build());
            }
        }
        summary.put("employeesCount", employeeRepository.count());

        // 10. Seed Operating Expenses (Facility rent, lights, court resurfacing)
        if (expenseRepository.count() == 0 || force) {
            expenseRepository.saveAll(List.of(
                    Expense.builder().expenseNumber("EXP-2026-001").category("RENT").description("Main Facility Monthly Land Lease").amount(new BigDecimal("120000.00")).taxAmount(new BigDecimal("21600.00")).totalAmount(new BigDecimal("141600.00")).vendor("Prestige Land Estates").status(ExpenseStatus.PAID).expenseDate(today.minusDays(5)).paidAt(Instant.now().minus(Duration.ofDays(5))).build(),
                    Expense.builder().expenseNumber("EXP-2026-002").category("UTILITIES").description("Court Floodlights & Facility Power").amount(new BigDecimal("35000.00")).taxAmount(new BigDecimal("6300.00")).totalAmount(new BigDecimal("41300.00")).vendor("Bescom Electricity").status(ExpenseStatus.PAID).expenseDate(today.minusDays(10)).paidAt(Instant.now().minus(Duration.ofDays(10))).build(),
                    Expense.builder().expenseNumber("EXP-2026-003").category("REPAIRS").description("Badminton Synthetic Court 2 Line Re-marking").amount(new BigDecimal("18500.00")).taxAmount(new BigDecimal("3330.00")).totalAmount(new BigDecimal("21830.00")).vendor("Apex Court Services").status(ExpenseStatus.PENDING).expenseDate(today.minusDays(2)).build(),
                    Expense.builder().expenseNumber("EXP-2026-004").category("EQUIPMENT").description("Electronic Stringing Machine Calibration").amount(new BigDecimal("9500.00")).taxAmount(new BigDecimal("1710.00")).totalAmount(new BigDecimal("11210.00")).vendor("Yonex Technical Care").status(ExpenseStatus.PAID).expenseDate(today.minusDays(15)).paidAt(Instant.now().minus(Duration.ofDays(15))).build()
            ));
        }
        summary.put("expensesCount", expenseRepository.count());

        log.info("Realistic Demo Data Seeding Completed Successfully: {}", summary);
        return summary;
    }
}
