package com.championsclub.court.service;

import com.championsclub.common.error.PricingRuleNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.DayType;
import com.championsclub.court.domain.PricingRule;
import com.championsclub.court.domain.Sport;
import com.championsclub.court.domain.SportType;
import com.championsclub.court.domain.TimeBand;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.PricingRuleRepository;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class PricingResolverServiceTest {

    private PricingRuleRepository pricingRuleRepository;
    private CourtRepository courtRepository;
    private UserRepository userRepository;
    private MembershipRepository membershipRepository;
    private ClubTimeUtils timeUtils;
    private PricingResolverService pricingResolverService;

    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-08T10:00:00Z"), zoneId);

    private Sport badmintonSport;
    private Sport tennisSport;
    private Court badmintonCourt;
    private Court tennisCourt;

    private Plan goldPlan;
    private Plan silverPlan;
    private Plan juniorPlan;

    private List<PricingRule> standardRules;

    @BeforeEach
    void setUp() {
        pricingRuleRepository = Mockito.mock(PricingRuleRepository.class);
        courtRepository = Mockito.mock(CourtRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        membershipRepository = Mockito.mock(MembershipRepository.class);

        timeUtils = new ClubTimeUtils(clock, zoneId);
        pricingResolverService = new PricingResolverService(
                pricingRuleRepository,
                courtRepository,
                userRepository,
                membershipRepository,
                timeUtils
        );

        badmintonSport = Sport.builder()
                .id(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"))
                .name("Badminton")
                .build();

        tennisSport = Sport.builder()
                .id(UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))
                .name("Tennis")
                .build();

        badmintonCourt = Court.builder()
                .id(UUID.fromString("c1111111-1111-1111-1111-111111111111"))
                .name("Badminton Court 1")
                .sport(badmintonSport)
                .sportType(SportType.BADMINTON)
                .surface("SYNTHETIC")
                .indoor(true)
                .status(CourtStatus.ACTIVE)
                .hourlyRateMember(BigDecimal.valueOf(15))
                .hourlyRateGuest(BigDecimal.valueOf(20))
                .build();

        tennisCourt = Court.builder()
                .id(UUID.fromString("c4444444-4444-4444-4444-444444444444"))
                .name("Tennis Court 1")
                .sport(tennisSport)
                .sportType(SportType.TENNIS)
                .surface("ACRYLIC_HARD")
                .indoor(false)
                .status(CourtStatus.ACTIVE)
                .hourlyRateMember(BigDecimal.valueOf(25))
                .hourlyRateGuest(BigDecimal.valueOf(35))
                .build();

        goldPlan = Plan.builder()
                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .code("GOLD")
                .name("Gold VIP")
                .build();

        silverPlan = Plan.builder()
                .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                .code("SILVER")
                .name("Silver Classic")
                .build();

        juniorPlan = Plan.builder()
                .id(UUID.fromString("33333333-3333-3333-3333-333333333333"))
                .code("JUNIOR")
                .name("Junior Cadet")
                .build();

        initStandardRules();
        when(pricingRuleRepository.findCandidateRules(any(), any())).thenReturn(standardRules);
    }

    private void initStandardRules() {
        standardRules = new ArrayList<>();

        // 1. Walk-in / Guest weekday offpeak (06:00 to 17:00) -> 20.00
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(null)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.OFFPEAK)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(17, 0))
                .price(BigDecimal.valueOf(20.00)).priority(10).isActive(true).isDeleted(false)
                .build());

        // 2. Walk-in / Guest weekday peak (17:00 to 23:00) -> 30.00
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(null)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(30.00)).priority(10).isActive(true).isDeleted(false)
                .build());

        // 3. Walk-in / Guest weekend all day (06:00 to 23:00) -> 30.00
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(null)
                .dayType(DayType.WEEKEND).timeBand(TimeBand.ALL)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(30.00)).priority(10).isActive(true).isDeleted(false)
                .build());

        // 4. Silver member weekday offpeak (06:00 to 17:00) -> 15.00
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(silverPlan)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.OFFPEAK)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(17, 0))
                .price(BigDecimal.valueOf(15.00)).priority(20).isActive(true).isDeleted(false)
                .build());

        // 5. Silver member weekday peak (17:00 to 23:00) -> 22.50
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(silverPlan)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(22.50)).priority(20).isActive(true).isDeleted(false)
                .build());

        // 6. Silver member weekend all day (06:00 to 23:00) -> 22.50
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(silverPlan)
                .dayType(DayType.WEEKEND).timeBand(TimeBand.ALL)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(22.50)).priority(20).isActive(true).isDeleted(false)
                .build());

        // 7. Gold member complimentary free (0.00) configured
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(goldPlan)
                .dayType(DayType.ALL).timeBand(TimeBand.ALL)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.ZERO).priority(30).isActive(true).isDeleted(false)
                .build());

        // 8. Junior member weekday offpeak (06:00 to 17:00) -> 10.00
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(juniorPlan)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.OFFPEAK)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(17, 0))
                .price(BigDecimal.valueOf(10.00)).priority(20).isActive(true).isDeleted(false)
                .build());

        // 9. Junior member weekday peak (17:00 to 20:00) -> 15.00
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(juniorPlan)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(20, 0))
                .price(BigDecimal.valueOf(15.00)).priority(20).isActive(true).isDeleted(false)
                .build());

        // 10. Tennis sport-specific weekday peak walk-in override -> 40.00 (Sport specificity +100 beats generic)
        standardRules.add(PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(tennisSport).plan(null)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(40.00)).priority(10).isActive(true).isDeleted(false)
                .build());
    }

    private Instant toInstant(LocalDate date, LocalTime time) {
        return date.atTime(time).atZone(zoneId).toInstant();
    }

    @ParameterizedTest(name = "{index} => {0}: date={1}, time={2}, court={3}, plan={4} => price={5}")
    @MethodSource("pricingMatrixCombinations")
    @DisplayName("25+ Table-driven pricing resolution test cases including boundary minutes")
    void testPricingMatrix(
            String testCaseName,
            LocalDate date,
            LocalTime time,
            String courtType,
            String planCode,
            BigDecimal expectedPrice
    ) {
        Court court = "TENNIS".equals(courtType) ? tennisCourt : badmintonCourt;
        Plan plan = switch (planCode) {
            case "GOLD" -> goldPlan;
            case "SILVER" -> silverPlan;
            case "JUNIOR" -> juniorPlan;
            default -> null; // Walk-in / Guest
        };

        Instant startInstant = toInstant(date, time);

        PricingQuoteResponse quote = pricingResolverService.resolveQuote(
                court, startInstant, plan, UUID.randomUUID(), null
        );

        assertThat(quote.getPrice()).isEqualByComparingTo(expectedPrice);
        assertThat(quote.getExplanation()).isNotEmpty();
    }

    private static Stream<Arguments> pricingMatrixCombinations() {
        LocalDate weekday = LocalDate.of(2026, 10, 8); // Thursday
        LocalDate weekend = LocalDate.of(2026, 10, 10); // Saturday

        return Stream.of(
                // --- Walk-in / Guest Weekday cases & Boundary Minutes ---
                Arguments.of("Guest Weekday 06:00 Morning Opening", weekday, LocalTime.of(6, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(20.00)),
                Arguments.of("Guest Weekday 12:00 Midday Offpeak", weekday, LocalTime.of(12, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(20.00)),
                Arguments.of("Guest Weekday 16:30 Spanning peak boundary mid-session (16:30-17:30)", weekday, LocalTime.of(16, 30), "BADMINTON", "GUEST", BigDecimal.valueOf(20.00)),
                Arguments.of("Guest Weekday 16:59 Boundary minute right before peak", weekday, LocalTime.of(16, 59), "BADMINTON", "GUEST", BigDecimal.valueOf(20.00)),
                Arguments.of("Guest Weekday 17:00 Exact Peak Window Start", weekday, LocalTime.of(17, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),
                Arguments.of("Guest Weekday 18:30 Prime Peak Time", weekday, LocalTime.of(18, 30), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),
                Arguments.of("Guest Weekday 22:00 Late Peak Slot", weekday, LocalTime.of(22, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),
                Arguments.of("Guest Weekday 22:59 Boundary minute right before closing", weekday, LocalTime.of(22, 59), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),

                // --- Silver Member Weekday cases & Boundary Minutes ---
                Arguments.of("Silver Member Weekday 06:00 Offpeak", weekday, LocalTime.of(6, 0), "BADMINTON", "SILVER", BigDecimal.valueOf(15.00)),
                Arguments.of("Silver Member Weekday 16:30 Mid-Session Peak Boundary", weekday, LocalTime.of(16, 30), "BADMINTON", "SILVER", BigDecimal.valueOf(15.00)),
                Arguments.of("Silver Member Weekday 16:59 Last Offpeak Minute", weekday, LocalTime.of(16, 59), "BADMINTON", "SILVER", BigDecimal.valueOf(15.00)),
                Arguments.of("Silver Member Weekday 17:00 Peak Start Minute", weekday, LocalTime.of(17, 0), "BADMINTON", "SILVER", BigDecimal.valueOf(22.50)),
                Arguments.of("Silver Member Weekday 20:00 Evening Peak", weekday, LocalTime.of(20, 0), "BADMINTON", "SILVER", BigDecimal.valueOf(22.50)),

                // --- Weekend cases (Guest vs Silver) ---
                Arguments.of("Guest Weekend 07:00 Morning", weekend, LocalTime.of(7, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),
                Arguments.of("Guest Weekend 14:00 Afternoon", weekend, LocalTime.of(14, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),
                Arguments.of("Guest Weekend 19:00 Evening", weekend, LocalTime.of(19, 0), "BADMINTON", "GUEST", BigDecimal.valueOf(30.00)),
                Arguments.of("Silver Weekend 09:00 Morning", weekend, LocalTime.of(9, 0), "BADMINTON", "SILVER", BigDecimal.valueOf(22.50)),
                Arguments.of("Silver Weekend 18:00 Evening", weekend, LocalTime.of(18, 0), "BADMINTON", "SILVER", BigDecimal.valueOf(22.50)),

                // --- Gold VIP Member Complimentary Free (0.00) Configuration ---
                Arguments.of("Gold Member Weekday 06:00 Morning Free", weekday, LocalTime.of(6, 0), "BADMINTON", "GOLD", BigDecimal.ZERO),
                Arguments.of("Gold Member Weekday 17:00 Peak Free", weekday, LocalTime.of(17, 0), "BADMINTON", "GOLD", BigDecimal.ZERO),
                Arguments.of("Gold Member Weekend 18:00 Peak Free", weekend, LocalTime.of(18, 0), "BADMINTON", "GOLD", BigDecimal.ZERO),

                // --- Junior Cadet Tier Cases ---
                Arguments.of("Junior Member Weekday 15:00 Offpeak", weekday, LocalTime.of(15, 0), "BADMINTON", "JUNIOR", BigDecimal.valueOf(10.00)),
                Arguments.of("Junior Member Weekday 17:30 Peak", weekday, LocalTime.of(17, 30), "BADMINTON", "JUNIOR", BigDecimal.valueOf(15.00)),

                // --- Specific Sport Override (Tennis Specificity +100 beats Generic Sport) ---
                Arguments.of("Tennis Specific Peak Override for Guest", weekday, LocalTime.of(18, 0), "TENNIS", "GUEST", BigDecimal.valueOf(40.00)),
                Arguments.of("Tennis Specific Peak at 17:00 Boundary", weekday, LocalTime.of(17, 0), "TENNIS", "GUEST", BigDecimal.valueOf(40.00)),
                Arguments.of("Tennis Offpeak falls back to Generic Guest rate", weekday, LocalTime.of(10, 0), "TENNIS", "GUEST", BigDecimal.valueOf(20.00))
        );
    }

    @Test
    @DisplayName("Rule Gap throws PricingRuleNotFoundException with clear message - never silent 0")
    void testRuleGapThrowsExceptionNeverSilentZero() {
        when(pricingRuleRepository.findCandidateRules(any(), any())).thenReturn(List.of());

        LocalDate date = LocalDate.of(2026, 10, 8);
        Instant start = toInstant(date, LocalTime.of(14, 0));

        assertThatThrownBy(() -> pricingResolverService.resolveQuote(
                badmintonCourt, start, null, UUID.randomUUID(), null
        ))
                .isInstanceOf(PricingRuleNotFoundException.class)
                .hasMessageContaining("No applicable pricing rule found")
                .hasMessageContaining("Pricing cannot silently resolve to 0");
    }

    @Test
    @DisplayName("Deterministic resolution: Specificity beats high priority on generic rule")
    void testSpecificityBeatsHighPriority() {
        PricingRule genericHighPriority = PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(null)
                .dayType(DayType.ALL).timeBand(TimeBand.ALL)
                .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(99.00))
                .priority(100) // Very high priority
                .isActive(true).isDeleted(false)
                .build();

        PricingRule specificSilverRule = PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(silverPlan) // Specific plan match: +100
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(22.50))
                .priority(10) // Lower priority
                .isActive(true).isDeleted(false)
                .build();

        when(pricingRuleRepository.findCandidateRules(any(), any()))
                .thenReturn(List.of(genericHighPriority, specificSilverRule));

        LocalDate date = LocalDate.of(2026, 10, 8);
        Instant start = toInstant(date, LocalTime.of(18, 0));

        PricingQuoteResponse quote = pricingResolverService.resolveQuote(
                badmintonCourt, start, silverPlan, UUID.randomUUID(), null
        );

        // Specificity wins (Silver plan rule: 120 points vs generic: 0 points)
        assertThat(quote.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(22.50));
    }

    @Test
    @DisplayName("Deterministic resolution: Same specificity tie-broken by priority")
    void testSameSpecificityTieBrokenByPriority() {
        PricingRule ruleLowerPriority = PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(silverPlan)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(25.00))
                .priority(10)
                .isActive(true).isDeleted(false)
                .build();

        PricingRule ruleHigherPriority = PricingRule.builder()
                .id(UUID.randomUUID())
                .sport(null).plan(silverPlan)
                .dayType(DayType.WEEKDAY).timeBand(TimeBand.PEAK)
                .startTime(LocalTime.of(17, 0)).endTime(LocalTime.of(23, 0))
                .price(BigDecimal.valueOf(18.00))
                .priority(50)
                .isActive(true).isDeleted(false)
                .build();

        when(pricingRuleRepository.findCandidateRules(any(), any()))
                .thenReturn(List.of(ruleLowerPriority, ruleHigherPriority));

        LocalDate date = LocalDate.of(2026, 10, 8);
        Instant start = toInstant(date, LocalTime.of(18, 0));

        PricingQuoteResponse quote = pricingResolverService.resolveQuote(
                badmintonCourt, start, silverPlan, UUID.randomUUID(), null
        );

        // Higher priority rule (50 > 10) wins
        assertThat(quote.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(18.00));
    }
}
