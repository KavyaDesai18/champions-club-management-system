package com.championsclub.court.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingSource;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.OpeningHours;
import com.championsclub.court.domain.PaymentStatus;
import com.championsclub.court.dto.BookingResponse;
import com.championsclub.court.dto.CreateBookingRequest;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.repo.BookingParticipantRepository;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.BookingWaitlistRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.OpeningHoursRepository;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.common.security.Role;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BookingConcurrencyTest {

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingParticipantRepository participantRepository;

    @Mock
    private BookingWaitlistRepository waitlistRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private OpeningHoursRepository openingHoursRepository;

    @Mock
    private CourtBlackoutRepository blackoutRepository;

    @Mock
    private PricingResolverService pricingResolverService;

    @Mock
    private AuditService auditService;

    @Mock
    private AvailabilitySseHub sseHub;

    @Mock
    private NotificationDispatcher notificationDispatcher;

    private ClubTimeUtils timeUtils;
    private CourtBookingService service;

    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    private final Instant baseTime = Instant.parse("2026-10-06T08:00:00Z");

    private Court testCourt;
    private Plan goldPlan;
    private Member testMember;
    private User testUser;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(baseTime, zoneId);
        timeUtils = new ClubTimeUtils(fixedClock, zoneId);

        service = new CourtBookingService(
                courtRepository,
                bookingRepository,
                participantRepository,
                waitlistRepository,
                userRepository,
                memberRepository,
                openingHoursRepository,
                blackoutRepository,
                pricingResolverService,
                timeUtils,
                auditService,
                sseHub,
                notificationDispatcher
        );

        testCourt = Court.builder()
                .id(UUID.randomUUID())
                .name("Badminton Court 1")
                .status(CourtStatus.ACTIVE)
                .isActive(true)
                .hourlyRateMember(BigDecimal.valueOf(15.00))
                .hourlyRateGuest(BigDecimal.valueOf(20.00))
                .build();

        goldPlan = Plan.builder()
                .id(UUID.randomUUID())
                .code("GOLD")
                .name("Gold VIP")
                .advanceBookingDays(14)
                .maxBookingsPerDay(2)
                .build();

        testUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Rahul Dravid")
                .role(Role.MEMBER)
                .build();

        testMember = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-00100")
                .fullName("Rahul Dravid")
                .status(MemberStatus.ACTIVE)
                .plan(goldPlan)
                .user(testUser)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .dob(LocalDate.of(1990, 1, 1))
                .build();

        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());

        OpeningHours hours = OpeningHours.builder()
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(23, 0))
                .isClosed(false)
                .build();
        when(openingHoursRepository.findRulesForDateAndCourts(any(), any(), any()))
                .thenReturn(List.of(hours));

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder().price(BigDecimal.valueOf(15.00)).planCode("GOLD").build());
    }

    @Test
    @DisplayName("Concurrency: 50 concurrent requests for the same slot give exactly 1 success")
    void testFiftyConcurrentRequestsForSameSlotYieldsExactlyOneSuccess() throws InterruptedException {
        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        Instant end = start.plus(60, ChronoUnit.MINUTES);

        // Concurrent atomic store simulating PostgreSQL GiST exclusion constraint guard
        ConcurrentHashMap<String, Booking> reservedSlots = new ConcurrentHashMap<>();

        when(memberRepository.findByIdWithLock(any())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(0L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        // Thread-safe booking check and save
        when(bookingRepository.findConflictingBookings(any(), any(), any(), any())).thenAnswer(inv -> {
            String key = testCourt.getId() + ":" + start;
            if (reservedSlots.containsKey(key)) {
                return List.of(reservedSlots.get(key));
            }
            return Collections.emptyList();
        });

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            String key = b.getCourt().getId() + ":" + b.getStartAt();
            // Atomic check simulating Postgres EXCLUDE USING gist
            Booking prev = reservedSlots.putIfAbsent(key, b);
            if (prev != null) {
                throw new DoubleBookingException("Postgres Exclusion Violation: Court slot already reserved");
            }
            return b;
        });

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Exception> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await(); // Wait for simultaneous gun firing
                    CreateBookingRequest request = CreateBookingRequest.builder()
                            .courtId(testCourt.getId())
                            .memberId(testMember.getId())
                            .startTime(start)
                            .endTime(end)
                            .source(BookingSource.ONLINE)
                            .build();

                    service.createBooking(request, null, "127.0.0.1");
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                    errors.add(ex);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire!
        boolean finished = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).isTrue();
        System.out.printf(">>> Concurrency Test (50 threads on same slot): %d succeeded, %d failed with 409 conflict%n",
                successCount.get(), failureCount.get());

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(49);
        for (Exception err : errors) {
            assertThat(err).isInstanceOf(DoubleBookingException.class);
        }
    }

    @Test
    @DisplayName("Concurrency: same member books 3 slots in parallel gives exactly 2 succeed")
    void testSameMemberBooksThreeSlotsInParallelYieldsExactlyTwoSucceed() throws InterruptedException {
        int threadCount = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        // 3 different times on the same club day: 10:00, 12:00, 15:00
        Instant[] startTimes = new Instant[]{
                Instant.parse("2026-10-07T04:30:00Z"), // 10:00 IST
                Instant.parse("2026-10-07T06:30:00Z"), // 12:00 IST
                Instant.parse("2026-10-07T09:30:00Z")  // 15:00 IST
        };

        // Real pessimistic row lock simulation on member record
        ReentrantLock memberRowLock = new ReentrantLock();
        AtomicInteger activeDailyCount = new AtomicInteger(0);

        when(memberRepository.findByIdWithLock(testMember.getId())).thenAnswer(inv -> {
            memberRowLock.lock();
            return Optional.of(testMember);
        });

        when(bookingRepository.findConflictingBookings(any(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenAnswer(inv -> {
            return (long) activeDailyCount.get();
        });

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            try {
                Booking b = inv.getArgument(0);
                b.setId(UUID.randomUUID());
                activeDailyCount.incrementAndGet();
                return b;
            } finally {
                if (memberRowLock.isHeldByCurrentThread()) {
                    memberRowLock.unlock();
                }
            }
        });

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Exception> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    CreateBookingRequest request = CreateBookingRequest.builder()
                            .courtId(testCourt.getId())
                            .memberId(testMember.getId())
                            .startTime(startTimes[index])
                            .endTime(startTimes[index].plus(60, ChronoUnit.MINUTES))
                            .source(BookingSource.ONLINE)
                            .build();

                    service.createBooking(request, null, "127.0.0.1");
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    if (memberRowLock.isHeldByCurrentThread()) {
                        memberRowLock.unlock();
                    }
                    failureCount.incrementAndGet();
                    errors.add(ex);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        boolean finished = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(finished).isTrue();
        System.out.printf(">>> Concurrency Test (Member books 3 in parallel): %d succeeded, %d failed with quota limit%n",
                successCount.get(), failureCount.get());

        assertThat(successCount.get()).isEqualTo(2);
        assertThat(failureCount.get()).isEqualTo(1);
        assertThat(errors.get(0)).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Daily booking limit reached");
    }

    @Test
    @DisplayName("Two overlapping starts 6:00 and 6:30 on same court conflict")
    void testTwoOverlappingStartsConflict() {
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(0L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Instant start1 = Instant.parse("2026-10-07T00:30:00Z"); // 06:00 IST
        Instant end1 = start1.plus(60, ChronoUnit.MINUTES);       // 07:00 IST

        Instant start2 = Instant.parse("2026-10-07T01:00:00Z"); // 06:30 IST
        Instant end2 = start2.plus(60, ChronoUnit.MINUTES);       // 07:30 IST

        Booking existingSlot = Booking.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .startAt(start1)
                .endAt(end1)
                .status(BookingStatus.CONFIRMED)
                .build();

        // Querying for [06:30, 07:30) conflicts with existing [06:00, 07:00)
        when(bookingRepository.findConflictingBookings(eq(testCourt.getId()), eq(start2), eq(end2), any()))
                .thenReturn(List.of(existingSlot));

        CreateBookingRequest request2 = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start2)
                .endTime(end2)
                .build();

        assertThatThrownBy(() -> service.createBooking(request2, null, "127.0.0.1"))
                .isInstanceOf(DoubleBookingException.class)
                .hasMessageContaining("already reserved");
    }

    @Test
    @DisplayName("Adjacent 6:00 and 7:00 do NOT conflict")
    void testAdjacentSlotsDoNotConflict() {
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(0L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Instant start1 = Instant.parse("2026-10-07T00:30:00Z"); // 06:00 IST
        Instant end1 = start1.plus(60, ChronoUnit.MINUTES);       // 07:00 IST

        Instant start2 = end1;                                    // 07:00 IST
        Instant end2 = start2.plus(60, ChronoUnit.MINUTES);       // 08:00 IST

        // Half-open interval [06:00, 07:00) and [07:00, 08:00) do NOT overlap!
        when(bookingRepository.findConflictingBookings(eq(testCourt.getId()), eq(start2), eq(end2), any()))
                .thenReturn(Collections.emptyList());

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        CreateBookingRequest request2 = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start2)
                .endTime(end2)
                .build();

        BookingResponse response = service.createBooking(request2, null, "127.0.0.1");
        assertThat(response).isNotNull();
        assertThat(response.getStartTime()).isEqualTo(start2);
    }
}
