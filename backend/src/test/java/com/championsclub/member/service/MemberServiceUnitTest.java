package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DuplicateMemberException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.common.util.PhoneUtils;
import com.championsclub.member.domain.Guardian;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.ChangePlanRequest;
import com.championsclub.member.dto.Member360Dto;
import com.championsclub.member.dto.RegisterMemberRequest;
import com.championsclub.member.repo.GuardianRepository;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberServiceUnitTest {

    @Mock private MemberRepository memberRepository;
    @Mock private GuardianRepository guardianRepository;
    @Mock private UserRepository userRepository;
    @Mock private PlanService planService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditService auditService;

    private ClubTimeUtils timeUtils;
    private QrCodeService qrCodeService;
    private MemberService memberService;

    // Fixed club date: 2026-10-06
    private final LocalDate fixedClubDate = LocalDate.of(2026, 10, 6);
    private final Instant fixedInstant = fixedClubDate.atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant();

    private Plan goldPlan;
    private Plan silverPlan;
    private Plan juniorPlan;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(fixedInstant, ZoneId.of("Asia/Kolkata"));
        timeUtils = new ClubTimeUtils(fixedClock, ZoneId.of("Asia/Kolkata"));
        qrCodeService = new QrCodeService("test-secret-key-32-chars-length!!", 86400);

        memberService = new MemberService(
                memberRepository,
                guardianRepository,
                userRepository,
                planService,
                qrCodeService,
                passwordEncoder,
                timeUtils,
                auditService
        );

        goldPlan = Plan.builder()
                .id(UUID.randomUUID())
                .code("GOLD")
                .name("Gold VIP")
                .price(BigDecimal.valueOf(2999))
                .durationMonths(12)
                .advanceBookingDays(14)
                .courtDiscountPct(BigDecimal.valueOf(25))
                .active(true)
                .build();

        silverPlan = Plan.builder()
                .id(UUID.randomUUID())
                .code("SILVER")
                .name("Silver Standard")
                .price(BigDecimal.valueOf(1499))
                .durationMonths(12)
                .advanceBookingDays(7)
                .courtDiscountPct(BigDecimal.valueOf(10))
                .active(true)
                .build();

        juniorPlan = Plan.builder()
                .id(UUID.randomUUID())
                .code("JUNIOR")
                .name("Junior Cadet")
                .price(BigDecimal.valueOf(999))
                .durationMonths(12)
                .advanceBookingDays(7)
                .courtDiscountPct(BigDecimal.valueOf(30))
                .active(true)
                .build();
    }

    @Nested
    @DisplayName("Age Rules & Guardian Requirement Tests")
    class AgeAndJuniorRulesTests {

        @Test
        @DisplayName("Rejects registration if DOB is in future")
        void rejectsFutureDob() {
            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Future Boy")
                    .email("future@test.com")
                    .phone("+919876543210")
                    .dob(fixedClubDate.plusDays(1))
                    .planCode("GOLD")
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("future");
        }

        @Test
        @DisplayName("Rejects registration if DOB is older than 120 years")
        void rejectsOver120YearsDob() {
            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Ancient One")
                    .email("ancient@test.com")
                    .phone("+919876543210")
                    .dob(fixedClubDate.minusYears(125))
                    .planCode("GOLD")
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("realistic lifespan");
        }

        @Test
        @DisplayName("Minor (<18) requires parental/guardian details and consent")
        void minorRequiresGuardian() {
            LocalDate minorDob = fixedClubDate.minusYears(15);
            when(planService.getPlanByCode("JUNIOR")).thenReturn(juniorPlan);

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Tommy Junior")
                    .email("tommy@test.com")
                    .phone("+919876543210")
                    .dob(minorDob)
                    .planCode("JUNIOR")
                    // Missing guardian details
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("Parental/Guardian details and consent are mandatory");
        }

        @Test
        @DisplayName("Minor (<18) cannot select adult plans (Gold/Silver)")
        void minorCannotSelectAdultPlan() {
            LocalDate minorDob = fixedClubDate.minusYears(16);
            when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Sammy Minor")
                    .email("sammy@test.com")
                    .phone("+919876543210")
                    .dob(minorDob)
                    .planCode("GOLD")
                    .guardianName("Papa Minor")
                    .guardianPhone("+919876543211")
                    .guardianRelation("Father")
                    .guardianConsent(true)
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("Junior Cadet plan");
        }

        @Test
        @DisplayName("Adult (18+) cannot enroll in Junior plan")
        void adultCannotSelectJuniorPlan() {
            LocalDate adultDob = fixedClubDate.minusYears(25);
            when(planService.getPlanByCode("JUNIOR")).thenReturn(juniorPlan);

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Big Adult")
                    .email("adult@test.com")
                    .phone("+919876543210")
                    .dob(adultDob)
                    .planCode("JUNIOR")
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("cannot enroll in the Junior plan");
        }

        @Test
        @DisplayName("Calculates age correctly on exact 18th birthday")
        void exact18thBirthdayIsAdult() {
            LocalDate exact18Dob = fixedClubDate.minusYears(18); // Born 2008-10-06
            when(planService.getPlanByCode("SILVER")).thenReturn(silverPlan);
            when(memberRepository.getNextMemberSequence()).thenReturn(101L);
            when(memberRepository.save(any(Member.class))).thenAnswer(i -> {
                Member m = i.getArgument(0);
                m.setId(UUID.randomUUID());
                return m;
            });

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Birthday Boy")
                    .email("birthday@test.com")
                    .phone("+919876543210")
                    .dob(exact18Dob)
                    .planCode("SILVER")
                    .build();

            Member360Dto response = memberService.registerMember(request, "TEST");
            assertThat(response.getProfile().getAge()).isEqualTo(18);
            assertThat(response.getProfile().getIsMinor()).isFalse();
        }

        @Test
        @DisplayName("Handles Leap Day (Feb 29) DOB gracefully")
        void leapDayDobCalculation() {
            // Leap day: 2008-02-29. In 2026, age is 18
            LocalDate leapDayDob = LocalDate.of(2008, 2, 29);
            when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
            when(memberRepository.getNextMemberSequence()).thenReturn(102L);
            when(memberRepository.save(any(Member.class))).thenAnswer(i -> {
                Member m = i.getArgument(0);
                m.setId(UUID.randomUUID());
                return m;
            });

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Leap Year Hero")
                    .email("leap@test.com")
                    .phone("+919876543210")
                    .dob(leapDayDob)
                    .planCode("GOLD")
                    .build();

            Member360Dto response = memberService.registerMember(request, "TEST");
            assertThat(response.getProfile().getAge()).isEqualTo(18);
        }

        @Test
        @DisplayName("Flags upgradeDue when member turns 18 on Junior plan")
        void upgradeDueFlaggedWhenTurning18OnJunior() {
            Member member = Member.builder()
                    .id(UUID.randomUUID())
                    .memberNo("CC-000088")
                    .fullName("Aging Junior")
                    .email("aging@test.com")
                    .phone("+919876543210")
                    .dob(fixedClubDate.minusYears(18)) // Just turned 18
                    .plan(juniorPlan)
                    .status(MemberStatus.ACTIVE)
                    .startDate(fixedClubDate.minusMonths(6))
                    .endDate(fixedClubDate.plusMonths(6))
                    .walletBalance(BigDecimal.ZERO)
                    .build();

            when(memberRepository.findByIdAndIsDeletedFalse(member.getId())).thenReturn(Optional.of(member));

            Member360Dto dto = memberService.getMember360(member.getId());
            assertThat(dto.getProfile().getUpgradeDue()).isTrue();
            assertThat(dto.getValidity().isUpgradeDue()).isTrue();
        }
    }

    @Nested
    @DisplayName("Phone Normalization & Duplicate Prevention Tests")
    class NormalizationAndDuplicateTests {

        @Test
        @DisplayName("Normalizes Indian and International phone formats properly")
        void phoneNormalizationRules() {
            assertThat(PhoneUtils.normalizePhone("9876543210")).isEqualTo("+919876543210");
            assertThat(PhoneUtils.normalizePhone("09876543210")).isEqualTo("+919876543210");
            assertThat(PhoneUtils.normalizePhone("919876543210")).isEqualTo("+919876543210");
            assertThat(PhoneUtils.normalizePhone("+91 98765-43210")).isEqualTo("+919876543210");
            assertThat(PhoneUtils.normalizePhone("+1 (555) 234-5678")).isEqualTo("+15552345678");
            // Scientific notation from Excel:
            assertThat(PhoneUtils.normalizePhone("9.87654321E+09")).isEqualTo("+919876543210");
        }

        @Test
        @DisplayName("Throws DuplicateMemberException with link on duplicate phone")
        void duplicatePhoneThrowsWithExistingMemberLink() {
            String phone = "+919876543210";
            Member existing = Member.builder()
                    .id(UUID.fromString("44444444-4444-4444-4444-444444444444"))
                    .memberNo("CC-000042")
                    .fullName("Rohan Gavaskar")
                    .phone(phone)
                    .build();

            when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
            when(memberRepository.findByPhoneAndIsDeletedFalse(phone)).thenReturn(Optional.of(existing));

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Duplicate Person")
                    .email("unique@test.com")
                    .phone("9876543210")
                    .dob(fixedClubDate.minusYears(25))
                    .planCode("GOLD")
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(DuplicateMemberException.class)
                    .satisfies(ex -> {
                        DuplicateMemberException dme = (DuplicateMemberException) ex;
                        assertThat(dme.getCode()).isEqualTo("DUPLICATE_MEMBER_PHONE");
                        assertThat(dme.getExistingMemberNo()).isEqualTo("CC-000042");
                        assertThat(dme.getExistingMemberId()).isEqualTo("44444444-4444-4444-4444-444444444444");
                    });
        }

        @Test
        @DisplayName("Throws DuplicateMemberException on duplicate email case-insensitively")
        void duplicateEmailThrowsCaseInsensitive() {
            String email = "athlete@championsclub.com";
            Member existing = Member.builder()
                    .id(UUID.fromString("55555555-5555-5555-5555-555555555555"))
                    .memberNo("CC-000099")
                    .fullName("Deepika Padukone")
                    .email(email)
                    .phone("+919876543219")
                    .build();

            when(planService.getPlanByCode("SILVER")).thenReturn(silverPlan);
            when(memberRepository.findByPhoneAndIsDeletedFalse("+919876543210")).thenReturn(Optional.empty());
            when(memberRepository.findByEmailAndIsDeletedFalse(email)).thenReturn(Optional.of(existing));

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Duplicate Email Person")
                    .email("  Athlete@ChampionsClub.COM  ")
                    .phone("9876543210")
                    .dob(fixedClubDate.minusYears(25))
                    .planCode("SILVER")
                    .build();

            assertThatThrownBy(() -> memberService.registerMember(request, "TEST"))
                    .isInstanceOf(DuplicateMemberException.class)
                    .satisfies(ex -> {
                        DuplicateMemberException dme = (DuplicateMemberException) ex;
                        assertThat(dme.getCode()).isEqualTo("DUPLICATE_MEMBER_EMAIL");
                        assertThat(dme.getExistingMemberNo()).isEqualTo("CC-000099");
                    });
        }
    }

    @Nested
    @DisplayName("Member Number Concurrency & Format Tests")
    class MemberNumberConcurrencyTests {

        @Test
        @DisplayName("Generates formatted CC-000123 number sequentially")
        void formatsMemberNumberCorrectly() {
            when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
            when(memberRepository.getNextMemberSequence()).thenReturn(7L);
            when(memberRepository.save(any(Member.class))).thenAnswer(i -> i.getArgument(0));

            RegisterMemberRequest request = RegisterMemberRequest.builder()
                    .fullName("Alice Walker")
                    .email("alice@test.com")
                    .phone("9876543210")
                    .dob(fixedClubDate.minusYears(30))
                    .planCode("GOLD")
                    .build();

            Member360Dto dto = memberService.registerMember(request, "TEST");
            assertThat(dto.getProfile().getMemberNo()).isEqualTo("CC-000007");
        }

        @Test
        @DisplayName("Handles concurrent sequence generation without collisions")
        void concurrentMemberNumberGeneration() throws InterruptedException {
            int threadCount = 20;
            AtomicLong sequenceGenerator = new AtomicLong(100);
            Set<String> generatedNumbers = ConcurrentHashMap.newKeySet();

            when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
            when(memberRepository.getNextMemberSequence()).thenAnswer(inv -> sequenceGenerator.incrementAndGet());
            when(memberRepository.save(any(Member.class))).thenAnswer(i -> i.getArgument(0));

            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch latch = new CountDownLatch(threadCount);

            for (int i = 0; i < threadCount; i++) {
                final int idx = i;
                executor.submit(() -> {
                    try {
                        RegisterMemberRequest request = RegisterMemberRequest.builder()
                                .fullName("Member " + idx)
                                .email("mem" + idx + "@test.com")
                                .phone("98765432" + (10 + idx))
                                .dob(fixedClubDate.minusYears(25))
                                .planCode("GOLD")
                                .build();
                        Member360Dto dto = memberService.registerMember(request, "TEST");
                        generatedNumbers.add(dto.getProfile().getMemberNo());
                    } finally {
                        latch.countDown();
                    }
                });
            }

            latch.await();
            executor.shutdown();

            assertThat(generatedNumbers).hasSize(threadCount);
        }
    }

    @Nested
    @DisplayName("QR Code Token & Security Verification Tests")
    class QrCodeSecurityTests {

        @Test
        @DisplayName("Generates and verifies signed HMAC QR token successfully")
        void generatesAndVerifiesValidToken() {
            UUID memberId = UUID.randomUUID();
            String memberNo = "CC-000555";

            String token = qrCodeService.generateQrToken(memberId, memberNo);
            assertThat(token).isNotBlank();

            QrCodeService.VerifiedQrToken verified = qrCodeService.verifyQrToken(token);
            assertThat(verified.memberId()).isEqualTo(memberId);
            assertThat(verified.memberNo()).isEqualTo(memberNo);
        }

        @Test
        @DisplayName("Rejects tampered QR tokens")
        void rejectsTamperedToken() {
            UUID memberId = UUID.randomUUID();
            String token = qrCodeService.generateQrToken(memberId, "CC-000555");

            // Tamper token string
            String tampered = token.substring(0, token.length() - 4) + "XXXX";

            assertThatThrownBy(() -> qrCodeService.verifyQrToken(tampered))
                    .isInstanceOf(BusinessValidationException.class);
        }

        @Test
        @DisplayName("Rejects expired QR tokens")
        void rejectsExpiredToken() {
            QrCodeService expiredQrService = new QrCodeService("test-secret-key-32-chars-length!!", -10); // already expired
            String token = expiredQrService.generateQrToken(UUID.randomUUID(), "CC-000123");

            assertThatThrownBy(() -> expiredQrService.verifyQrToken(token))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("expired");
        }
    }

    @Nested
    @DisplayName("Photo Upload Security & Validation Tests")
    class PhotoUploadTests {

        @Test
        @DisplayName("Rejects SVG file upload to prevent XSS script execution")
        void rejectsSvgPhotoUpload() {
            UUID memberId = UUID.randomUUID();
            Member member = Member.builder().id(memberId).build();
            when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));

            MockMultipartFile svgFile = new MockMultipartFile(
                    "file",
                    "avatar.svg",
                    "image/svg+xml",
                    "<svg><script>alert('xss')</script></svg>".getBytes()
            );

            assertThatThrownBy(() -> memberService.uploadMemberPhoto(memberId, svgFile))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("Only JPEG, PNG, and WebP are allowed");
        }

        @Test
        @DisplayName("Rejects oversized photos (>5MB)")
        void rejectsOversizedPhoto() {
            UUID memberId = UUID.randomUUID();
            Member member = Member.builder().id(memberId).build();
            when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));

            byte[] bigBytes = new byte[6 * 1024 * 1024]; // 6MB
            MockMultipartFile bigFile = new MockMultipartFile("file", "photo.png", "image/png", bigBytes);

            assertThatThrownBy(() -> memberService.uploadMemberPhoto(memberId, bigFile))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("5MB");
        }

        @Test
        @DisplayName("Accepts valid PNG photo upload and updates photoUrl")
        void acceptsValidPngPhoto() {
            UUID memberId = UUID.randomUUID();
            Member member = Member.builder().id(memberId).build();
            when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));

            MockMultipartFile pngFile = new MockMultipartFile("file", "pic.png", "image/png", new byte[]{1, 2, 3});
            String result = memberService.uploadMemberPhoto(memberId, pngFile);

            assertThat(result).startsWith("data:image/png;base64,");
            assertThat(member.getPhotoUrl()).isEqualTo(result);
        }
    }
}
