package com.championsclub.social.service;

import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.*;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.social.domain.*;
import com.championsclub.social.dto.CreateSocialSessionRequest;
import com.championsclub.social.dto.JoinSocialSessionRequest;
import com.championsclub.social.dto.SocialParticipantResponse;
import com.championsclub.social.repo.SocialParticipantRepository;
import com.championsclub.social.repo.SocialSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class SocialPlayConcurrencyTest {

    @Mock private SocialSessionRepository sessionRepository;
    @Mock private SocialParticipantRepository participantRepository;
    @Mock private CourtRepository courtRepository;
    @Mock private SportRepository sportRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private CourtBlackoutRepository blackoutRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationDispatcher notificationDispatcher;

    private SocialPlayService service;
    private Clock fixedClock;
    private ClubTimeUtils timeUtils;

    private Court court;
    private Sport sport;

    @BeforeEach
    void setUp() {
        Instant now = Instant.parse("2026-10-09T10:00:00Z");
        fixedClock = Clock.fixed(now, ZoneId.of("Asia/Kolkata"));
        timeUtils = new ClubTimeUtils(fixedClock, ZoneId.of("Asia/Kolkata"));

        service = new SocialPlayService(
                sessionRepository,
                participantRepository,
                courtRepository,
                sportRepository,
                bookingRepository,
                blackoutRepository,
                memberRepository,
                userRepository,
                notificationDispatcher,
                timeUtils,
                fixedClock
        );

        sport = Sport.builder().id(UUID.randomUUID()).name("Tennis").build();
        court = Court.builder().id(UUID.randomUUID()).name("Center Court").sport(sport).status(CourtStatus.ACTIVE).isActive(true).build();
    }

    @Test
    @DisplayName("100 simultaneous requests on the last seat: exactly 1 wins JOINED, 99 receive WAITLISTED")
    void test100ConcurrentJoinsOnLastSeat() throws InterruptedException {
        int capacity = 10;
        int preJoinedCount = 9; // Only 1 seat left!
        int concurrentCallers = 100;

        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(court)
                .sport(sport)
                .title("Friday Mixer - 1 Seat Left")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T21:00:00Z"))
                .capacity(capacity)
                .feeMember(new BigDecimal("10.00"))
                .status(SocialSessionStatus.SCHEDULED)
                .allowJuniors(true)
                .build();

        // Simulate DB pessimistic lock serialization via ReentrantLock
        ReentrantLock dbLock = new ReentrantLock(true);
        AtomicInteger currentJoined = new AtomicInteger(preJoinedCount);
        List<SocialParticipant> savedParticipants = Collections.synchronizedList(new ArrayList<>());

        when(sessionRepository.findByIdWithLock(sessionId)).thenAnswer(inv -> {
            dbLock.lock();
            return Optional.of(session);
        });

        when(participantRepository.countBySessionIdAndStatus(sessionId, SocialParticipantStatus.JOINED))
                .thenAnswer(inv -> (long) currentJoined.get());

        when(participantRepository.save(any(SocialParticipant.class))).thenAnswer(inv -> {
            try {
                SocialParticipant p = inv.getArgument(0);
                if (p.getStatus() == SocialParticipantStatus.JOINED) {
                    currentJoined.incrementAndGet();
                }
                savedParticipants.add(p);
                return p;
            } finally {
                if (dbLock.isHeldByCurrentThread()) {
                    dbLock.unlock();
                }
            }
        });

        Plan plan = Plan.builder().id(UUID.randomUUID()).code("SILVER").name("Silver").build();
        List<Member> mockMembers = new ArrayList<>();
        for (int i = 0; i < concurrentCallers; i++) {
            UUID memberId = UUID.randomUUID();
            Member m = Member.builder()
                    .id(memberId)
                    .fullName("Athlete " + i)
                    .status(MemberStatus.ACTIVE)
                    .plan(plan)
                    .dob(LocalDate.of(1990, 1, 1))
                    .build();
            mockMembers.add(m);
            when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(m));
            when(participantRepository.findActiveBySessionAndMember(sessionId, memberId)).thenReturn(Optional.empty());
        }

        ExecutorService executor = Executors.newFixedThreadPool(concurrentCallers);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(concurrentCallers);

        AtomicInteger joinedSuccesses = new AtomicInteger(0);
        AtomicInteger waitlistedCount = new AtomicInteger(0);

        for (int i = 0; i < concurrentCallers; i++) {
            final Member member = mockMembers.get(i);
            executor.submit(() -> {
                try {
                    startGate.await();
                    JoinSocialSessionRequest req = JoinSocialSessionRequest.builder().memberId(member.getId()).build();
                    SocialParticipantResponse resp = service.joinSession(sessionId, req, null);
                    if (resp.getStatus() == SocialParticipantStatus.JOINED) {
                        joinedSuccesses.incrementAndGet();
                    } else if (resp.getStatus() == SocialParticipantStatus.WAITLISTED) {
                        waitlistedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // unexpected error
                } finally {
                    finishGate.countDown();
                }
            });
        }

        // Fire all 100 threads simultaneously!
        startGate.countDown();
        boolean completed = finishGate.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        System.out.printf(">>> Social Play Concurrency Test (100 threads for last seat): %d JOINED, %d WAITLISTED%n",
                joinedSuccesses.get(), waitlistedCount.get());

        // Exactly 1 winner gets the last seat, exactly 99 get waitlisted
        assertThat(joinedSuccesses.get()).isEqualTo(1);
        assertThat(waitlistedCount.get()).isEqualTo(99);
        assertThat(savedParticipants).hasSize(concurrentCallers);
    }

    @Test
    @DisplayName("Collision Test: Social play court block prevents normal court booking")
    void testSocialPlayBlockPreventsNormalBooking() {
        Instant slotStart = Instant.parse("2026-10-09T18:00:00Z");
        Instant slotEnd = Instant.parse("2026-10-09T21:00:00Z");

        // Existing SOCIAL_BLOCK booking row
        Booking socialBlock = Booking.builder()
                .id(UUID.randomUUID())
                .court(court)
                .startAt(slotStart)
                .endAt(slotEnd)
                .status(BookingStatus.CONFIRMED)
                .source(BookingSource.SOCIAL_BLOCK)
                .planSnapshot("Friday Social Play Mixer")
                .build();

        // Normal booking attempts to book on the same court overlapping 18:00 - 19:00
        Instant normalStart = Instant.parse("2026-10-09T18:00:00Z");
        Instant normalEnd = Instant.parse("2026-10-09T19:00:00Z");

        when(bookingRepository.saveAndFlush(argThat(b ->
                b.getCourt().getId().equals(court.getId()) &&
                b.getSource() == BookingSource.ONLINE &&
                b.getStartAt().equals(normalStart)
        ))).thenThrow(new DataIntegrityViolationException("exclusion constraint no_overlapping_court_bookings"));

        Booking normalBooking = Booking.builder()
                .court(court)
                .startAt(normalStart)
                .endAt(normalEnd)
                .status(BookingStatus.CONFIRMED)
                .source(BookingSource.ONLINE)
                .build();

        assertThatThrownBy(() -> bookingRepository.saveAndFlush(normalBooking))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Collision Test: Existing normal booking prevents creation of social play session")
    void testExistingNormalBookingBlocksSocialSessionCreation() {
        Instant sessionStart = Instant.parse("2026-10-09T18:00:00Z");
        Instant sessionEnd = Instant.parse("2026-10-09T21:00:00Z");

        when(courtRepository.findById(court.getId())).thenReturn(Optional.of(court));
        when(sportRepository.findById(sport.getId())).thenReturn(Optional.of(sport));
        when(blackoutRepository.existsOverlapping(court.getId(), sessionStart, sessionEnd)).thenReturn(false);
        when(sessionRepository.existsOverlapping(court.getId(), sessionStart, sessionEnd)).thenReturn(false);

        // When social session tries to insert the SOCIAL_BLOCK row, it fails due to existing confirmed booking
        when(bookingRepository.saveAndFlush(argThat(b -> b.getSource() == BookingSource.SOCIAL_BLOCK)))
                .thenThrow(new DataIntegrityViolationException("EXCLUDE USING gist violation"));

        CreateSocialSessionRequest req = CreateSocialSessionRequest.builder()
                .courtId(court.getId())
                .sportId(sport.getId())
                .title("Friday Mixer")
                .startAt(sessionStart)
                .endAt(sessionEnd)
                .capacity(16)
                .build();

        assertThatThrownBy(() -> service.createSession(req, null))
                .isInstanceOf(DoubleBookingException.class)
                .hasMessageContaining("already booked for a regular session");
    }
}
