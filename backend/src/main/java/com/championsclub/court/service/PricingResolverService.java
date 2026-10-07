package com.championsclub.court.service;

import com.championsclub.common.error.PricingRuleNotFoundException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.DayType;
import com.championsclub.court.domain.PricingRule;
import com.championsclub.court.domain.Sport;
import com.championsclub.court.domain.TimeBand;
import com.championsclub.court.dto.PricingQuoteRequest;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.PricingRuleRepository;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PricingResolverService {

    private static final Logger log = LoggerFactory.getLogger(PricingResolverService.class);
    public static final Duration DEFAULT_SESSION_DURATION = Duration.ofMinutes(60);

    private final PricingRuleRepository pricingRuleRepository;
    private final CourtRepository courtRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final ClubTimeUtils timeUtils;

    public PricingResolverService(
            PricingRuleRepository pricingRuleRepository,
            CourtRepository courtRepository,
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            ClubTimeUtils timeUtils
    ) {
        this.pricingRuleRepository = pricingRuleRepository;
        this.courtRepository = courtRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.timeUtils = timeUtils;
    }

    @Transactional(readOnly = true)
    public PricingQuoteResponse calculateQuote(PricingQuoteRequest request) {
        Court court = courtRepository.findById(request.getCourtId())
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        User user = null;
        Membership membership = null;
        Plan plan = null;

        if (request.getMemberId() != null) {
            user = userRepository.findById(request.getMemberId())
                    .filter(u -> !u.isDeleted())
                    .orElse(null);

            if (user != null) {
                Optional<Membership> activeMembership = membershipRepository
                        .findByUserIdAndActiveTrueAndIsDeletedFalse(user.getId());
                LocalDate today = timeUtils.currentClubDate();
                if (activeMembership.isPresent()) {
                    Membership m = activeMembership.get();
                    if (m.getStatus() == MembershipStatus.ACTIVE && m.isActive() &&
                            (m.getEndDate() == null || !today.isAfter(m.getEndDate()))) {
                        membership = m;
                        plan = m.getPlan();
                    }
                }
            }
        }

        return resolveQuote(court, request.getStart(), plan, request.getMemberId(), user);
    }

    public PricingQuoteResponse resolveQuote(
            Court court,
            Instant startInstant,
            Plan plan,
            UUID memberId,
            User user
    ) {
        ZonedDateTime clubStartZdt = startInstant.atZone(timeUtils.getClubZoneId());
        LocalDate sessionDate = clubStartZdt.toLocalDate();
        LocalTime sessionStartTime = clubStartZdt.toLocalTime();
        Instant endInstant = startInstant.plus(DEFAULT_SESSION_DURATION);
        DayOfWeek dayOfWeek = clubStartZdt.getDayOfWeek();
        boolean isWeekend = (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY);

        UUID sportId = court.getSport() != null ? court.getSport().getId() : null;
        List<PricingRule> candidateRules = pricingRuleRepository.findCandidateRules(sportId, sessionDate);

        // Filter and score candidates
        List<ScoredRule> eligible = new ArrayList<>();
        for (PricingRule rule : candidateRules) {
            if (!isRuleEligible(rule, court, plan, isWeekend, sessionStartTime, sessionDate)) {
                continue;
            }
            int specificity = calculateSpecificity(rule, court, plan);
            eligible.add(new ScoredRule(rule, specificity));
        }

        if (eligible.isEmpty()) {
            String sportName = court.getSport() != null ? court.getSport().getName() : court.getSportType().name();
            String planInfo = plan != null ? plan.getCode() : "WALK_IN_GUEST";
            throw new PricingRuleNotFoundException(String.format(
                    "No applicable pricing rule found for court '%s' (%s), plan '%s', at %s on %s (%s). Pricing cannot silently resolve to 0.",
                    court.getName(), sportName, planInfo, sessionStartTime, sessionDate, dayOfWeek
            ));
        }

        // Sort deterministically:
        // 1. Specificity DESC
        // 2. Priority DESC
        // 3. CreatedAt DESC
        // 4. Rule ID ASC
        eligible.sort(Comparator
                .comparingInt(ScoredRule::specificity).reversed()
                .thenComparing((ScoredRule sr) -> sr.rule().getPriority(), Comparator.reverseOrder())
                .thenComparing((ScoredRule sr) -> sr.rule().getCreatedAt(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing((ScoredRule sr) -> sr.rule().getId())
        );

        ScoredRule winner = eligible.get(0);
        PricingRule matchedRule = winner.rule();
        BigDecimal price = matchedRule.getPrice();

        List<String> explanation = new ArrayList<>();
        explanation.add(String.format("Court: %s (Sport: %s, %s, %s)",
                court.getName(),
                court.getSport() != null ? court.getSport().getName() : court.getSportType().name(),
                court.getSurface(),
                court.getIndoor() != null && court.getIndoor() ? "Indoor" : "Outdoor"));
        explanation.add(String.format("Date & Time: %s (%s, %s), start %s [Priced by session start time]",
                sessionDate, dayOfWeek, isWeekend ? "WEEKEND" : "WEEKDAY", sessionStartTime));
        if (plan != null) {
            explanation.add(String.format("Member Tier Plan: %s (ID: %s)", plan.getCode(), plan.getId()));
        } else {
            explanation.add("Customer: Walk-in / Guest (Standard Rate)");
        }
        explanation.add(String.format("Matched Rule: ID=%s, DayType=%s, TimeBand=%s, Window=%s-%s, SpecificityScore=%d, Priority=%d",
                matchedRule.getId(), matchedRule.getDayType(), matchedRule.getTimeBand(),
                matchedRule.getStartTime(), matchedRule.getEndTime(), winner.specificity(), matchedRule.getPriority()));

        if (BigDecimal.ZERO.compareTo(price) == 0) {
            explanation.add("Price: Complimentary / Free (0.00) explicitly configured for plan " + (plan != null ? plan.getCode() : "N/A"));
        } else {
            explanation.add(String.format("Base Slot Rate: ₹%s", price.toPlainString()));
        }

        return PricingQuoteResponse.builder()
                .courtId(court.getId())
                .courtName(court.getName())
                .sportName(court.getSport() != null ? court.getSport().getName() : court.getSportType().name())
                .startTime(startInstant)
                .endTime(endInstant)
                .memberId(memberId)
                .planCode(plan != null ? plan.getCode() : "GUEST")
                .price(price)
                .currency("INR")
                .matchedRuleId(matchedRule.getId())
                .explanation(explanation)
                .build();
    }

    private boolean isRuleEligible(
            PricingRule rule,
            Court court,
            Plan plan,
            boolean isWeekend,
            LocalTime sessionStartTime,
            LocalDate sessionDate
    ) {
        if (!rule.isActive() || rule.isDeleted()) {
            return false;
        }

        // Validity dates
        if (rule.getValidFrom() != null && sessionDate.isBefore(rule.getValidFrom())) {
            return false;
        }
        if (rule.getValidTo() != null && sessionDate.isAfter(rule.getValidTo())) {
            return false;
        }

        // Sport match
        if (rule.getSport() != null) {
            if (court.getSport() == null || !rule.getSport().getId().equals(court.getSport().getId())) {
                return false;
            }
        }

        // Plan match
        if (plan != null) {
            // User has a plan: either rule matches this plan, or rule has no plan (generic fallback)
            if (rule.getPlan() != null && !rule.getPlan().getId().equals(plan.getId())) {
                return false;
            }
        } else {
            // Walk-in / Guest: rule must NOT require a membership plan
            if (rule.getPlan() != null) {
                return false;
            }
        }

        // Day type match
        if (isWeekend) {
            if (rule.getDayType() != DayType.WEEKEND && rule.getDayType() != DayType.ALL) {
                return false;
            }
        } else {
            if (rule.getDayType() != DayType.WEEKDAY && rule.getDayType() != DayType.ALL) {
                return false;
            }
        }

        // Time window match: priced strictly by session start time
        return isTimeWithinRule(sessionStartTime, rule.getStartTime(), rule.getEndTime());
    }

    private boolean isTimeWithinRule(LocalTime time, LocalTime start, LocalTime end) {
        // Handle midnight as closing boundary (00:00:00)
        boolean crossesMidnight = end.isBefore(start) || end.equals(LocalTime.MIN);
        if (crossesMidnight) {
            return !time.isBefore(start) || time.isBefore(end);
        } else {
            return !time.isBefore(start) && time.isBefore(end);
        }
    }

    private int calculateSpecificity(PricingRule rule, Court court, Plan plan) {
        int score = 0;
        // Specific sport match: +100
        if (rule.getSport() != null && court.getSport() != null &&
                rule.getSport().getId().equals(court.getSport().getId())) {
            score += 100;
        }
        // Specific plan match: +100
        if (rule.getPlan() != null && plan != null &&
                rule.getPlan().getId().equals(plan.getId())) {
            score += 100;
        }
        // Specific day type (WEEKDAY / WEEKEND vs ALL): +10
        if (rule.getDayType() != DayType.ALL) {
            score += 10;
        }
        // Specific time band (PEAK / OFFPEAK vs ALL): +10
        if (rule.getTimeBand() != TimeBand.ALL) {
            score += 10;
        }
        return score;
    }

    public record ScoredRule(PricingRule rule, int specificity) {}
}
